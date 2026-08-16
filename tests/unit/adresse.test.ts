import { afterEach, describe, expect, it, vi } from 'vitest';
import { comparePoints } from '@/demo/scenario';
import { makeAddressId, resolvePoint } from '@/features/search/placeSearch';

/**
 * Adresses libres : identifiants sûrs (aller-retour, bornés à la Côte
 * d'Ivoire), corridor de points sans distance inventée, et contrat du
 * client de géocodage (repli silencieux, mémoire des succès seulement).
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('identifiants d’adresse (g~…)', () => {
  it('aller-retour : fabriquer puis résoudre rend le même point', () => {
    const id = makeAddressId(5.35286, -3.98123, "Gare Routière d'Adjamé");
    const p = resolvePoint(id);
    expect(p).not.toBeNull();
    expect(p!.name).toBe("Gare Routière d'Adjamé");
    expect(p!.lat).toBeCloseTo(5.35286, 4);
    expect(p!.lng).toBeCloseTo(-3.98123, 4);
    expect(p!.placeId).toBeNull();
  });

  it('un quartier connu se résout avec son identifiant de lieu', () => {
    const p = resolvePoint('plateau');
    expect(p?.placeId).toBe('plateau');
    expect(p?.name).toBe('Plateau');
  });

  it('un lien forgé hors Côte d’Ivoire est rejeté', () => {
    expect(resolvePoint(makeAddressId(48.85, 2.35, 'Paris'))).toBeNull();
  });

  it('malformé ou inconnu : null', () => {
    expect(resolvePoint('g~abc~def~X')).toBeNull();
    expect(resolvePoint('g~5.3')).toBeNull();
    expect(resolvePoint('oslo')).toBeNull();
  });
});

describe('comparePoints — corridor entre adresses', () => {
  it('produit une comparaison complète pour une distance valide', () => {
    const cmp = comparePoints("Gare d'Adjamé", 'Cap Sud', 9.4, 'PRICE_TIME');
    expect(cmp).not.toBeNull();
    expect(cmp!.corridor.from).toBe("Gare d'Adjamé");
    expect(cmp!.corridor.to).toBe('Cap Sud');
    expect(cmp!.corridor.km).toBe(9.4);
    expect(cmp!.ranking.ranked.length).toBeGreaterThan(0);
  });

  it('distance invalide ou libellé vide : null, jamais d’invention', () => {
    expect(comparePoints('A', 'B', Number.NaN)).toBeNull();
    expect(comparePoints('A', 'B', 0)).toBeNull();
    expect(comparePoints('', 'B', 5)).toBeNull();
  });
});

async function loadClient(configured: boolean) {
  vi.resetModules();
  vi.doMock('@/config/env', () => ({
    env: { VITE_SUPABASE_URL: configured ? 'https://exemple.supabase.co' : undefined },
  }));
  return import('@/features/search/adresse');
}

describe('adresse — client du géocodeur', () => {
  it('sans backend ou requête trop courte : null, sans appel réseau', async () => {
    const { searchAddresses } = await loadClient(false);
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    expect(await searchAddresses('gare adjame')).toBeNull();
    const { searchAddresses: s2 } = await loadClient(true);
    expect(await s2('ga')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('succès : résultats renvoyés puis mémorisés (un seul appel réseau)', async () => {
    const { searchAddresses } = await loadClient(true);
    const spy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            disponible: true,
            resultats: [{ nom: 'Gare d’Adjamé', detail: 'Adjamé, Abidjan', lat: 5.35, lng: -4.02 }],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', spy);
    const hits = await searchAddresses('gare adjame');
    expect(hits).toHaveLength(1);
    await searchAddresses('gare adjame');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('503 (import en cours) : null, et pause avant de réessayer', async () => {
    const { searchAddresses } = await loadClient(true);
    const spy = vi.fn(
      async () => new Response(JSON.stringify({ disponible: false }), { status: 503 }),
    );
    vi.stubGlobal('fetch', spy);
    expect(await searchAddresses('gare adjame')).toBeNull();
    expect(await searchAddresses('autre requete')).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('réseau coupé : échec propre', async () => {
    const { searchAddresses } = await loadClient(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await searchAddresses('gare adjame')).toBeNull();
  });
});
