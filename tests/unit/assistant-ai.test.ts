import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Client de l'assistant IA : la clé du fournisseur ne transite jamais ici —
 * on vérifie le contrat avec l'Edge Function (succès, erreurs, absence de
 * configuration) et le marquage `unavailable` qui coupe l'IA pour la session.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load(configured: boolean) {
  vi.resetModules();
  vi.doMock('@/config/env', () => ({
    env: { VITE_SUPABASE_URL: configured ? 'https://exemple.supabase.co' : undefined },
  }));
  return import('@/features/assistant/ai');
}

describe('assistant IA — client', () => {
  it('sans backend configuré : indisponible, sans appel réseau', async () => {
    const { askAi, isAiConfigured } = await load(false);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(isAiConfigured()).toBe(false);
    const r = await askAi([{ role: 'user', content: 'Bonjour' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.unavailable).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('succès : renvoie la réponse du serveur', async () => {
    const { askAi } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ reply: 'Bonjour !' }), { status: 200 })),
    );
    const r = await askAi([{ role: 'user', content: 'Salut' }]);
    expect(r).toEqual({ ok: true, reply: 'Bonjour !' });
  });

  it('503 (clé absente côté serveur) : marqué indisponible', async () => {
    const { askAi } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'non activé' }), { status: 503 })),
    );
    const r = await askAi([{ role: 'user', content: 'Salut' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.unavailable).toBe(true);
      expect(r.error).toBe('non activé');
    }
  });

  it('502 (fournisseur en panne) : erreur SANS couper l’IA pour la session', async () => {
    const { askAi } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'indisponible' }), { status: 502 })),
    );
    const r = await askAi([{ role: 'user', content: 'Salut' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.unavailable).toBeFalsy();
  });

  it('réseau coupé : échec propre', async () => {
    const { askAi } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const r = await askAi([{ role: 'user', content: 'Salut' }]);
    expect(r.ok).toBe(false);
  });

  it('ne transmet que les 8 derniers tours', async () => {
    const { askAi } = await load(true);
    const fetchSpy = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `tour ${i}`,
    }));
    await askAi(history);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]?.body)) as {
      messages: unknown[];
    };
    expect(body.messages).toHaveLength(8);
  });
});
