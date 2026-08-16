import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Balise d'audience : on vérifie surtout ce qu'elle NE fait PAS — pas
 * d'envoi sans backend, pas d'envoi si le navigateur refuse le suivi,
 * pas de page hors liste blanche — et la distinction visite/vue.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

beforeEach(() => {
  window.sessionStorage.clear();
});

async function load(configured: boolean) {
  vi.resetModules();
  vi.doMock('@/config/env', () => ({
    env: { VITE_SUPABASE_URL: configured ? 'https://exemple.supabase.co' : undefined },
  }));
  return import('@/features/audience/beacon');
}

function stubFetch() {
  const spy = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

function corpsEnvoye(spy: ReturnType<typeof stubFetch>, appel = 0): Record<string, unknown> {
  return JSON.parse(String(spy.mock.calls[appel]![1]?.body)) as Record<string, unknown>;
}

describe('audience — balise', () => {
  it('sans backend configuré : aucun envoi', async () => {
    const { trackPage } = await load(false);
    const spy = stubFetch();
    trackPage('/');
    expect(spy).not.toHaveBeenCalled();
  });

  it('Do Not Track : aucun envoi, aucun marqueur posé', async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    vi.stubGlobal('navigator', { doNotTrack: '1' });
    trackPage('/');
    expect(spy).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('Global Privacy Control : aucun envoi non plus', async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    trackPage('/');
    expect(spy).not.toHaveBeenCalled();
  });

  it('page hors liste blanche (/moderation incluse) : aucun envoi', async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    trackPage('/moderation');
    trackPage('/nimporte-quoi');
    expect(spy).not.toHaveBeenCalled();
  });

  it('première page de la session : visite, les suivantes : vues', async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    trackPage('/');
    trackPage('/comparer');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(corpsEnvoye(spy, 0)).toEqual({ page: '/', visite: true });
    expect(corpsEnvoye(spy, 1)).toEqual({ page: '/comparer', visite: false });
  });

  it("l'ancienne adresse /demo est comptée comme /comparer", async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    trackPage('/demo');
    expect(corpsEnvoye(spy).page).toBe('/comparer');
  });

  it("le corps envoyé ne contient QUE page et visite — rien d'autre", async () => {
    const { trackPage } = await load(true);
    const spy = stubFetch();
    trackPage('/');
    expect(Object.keys(corpsEnvoye(spy)).sort()).toEqual(['page', 'visite']);
  });
});
