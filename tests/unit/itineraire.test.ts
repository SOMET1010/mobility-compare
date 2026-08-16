import { afterEach, describe, expect, it, vi } from 'vitest';
import { comparePair } from '@/demo/scenario';

/**
 * Client du serveur de routage : le jeton ne transite jamais ici — on
 * vérifie le contrat avec l'Edge Function `itineraire` (succès, repli
 * honnête, mémoire de session) et la surcharge de distance du comparateur.
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
  return import('@/features/routing/itineraire');
}

const A = { lat: 5.32, lng: -4.017 };
const B = { lat: 5.359, lng: -3.983 };

describe('itineraire — client', () => {
  it('sans backend configuré : null, sans appel réseau', async () => {
    const { fetchRoadRoute } = await load(false);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchRoadRoute(A, B)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('succès : distance arrondie à 0,1 km, durée transmise', async () => {
    const { fetchRoadRoute } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ disponible: true, distance_m: 8722, duree_s: 764 }), {
            status: 200,
          }),
      ),
    );
    expect(await fetchRoadRoute(A, B)).toEqual({ km: 8.7, durationS: 764 });
  });

  it('mémoire de session : la même paire ne repart pas au serveur', async () => {
    const { fetchRoadRoute } = await load(true);
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ disponible: true, distance_m: 8722, duree_s: 764 }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    await fetchRoadRoute(A, B);
    await fetchRoadRoute(A, B);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('503 (serveur injoignable) : null, et PAS mémorisé — on réessaiera', async () => {
    const { fetchRoadRoute } = await load(true);
    const fetchSpy = vi.fn(
      async () => new Response(JSON.stringify({ disponible: false }), { status: 503 }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchRoadRoute(A, B)).toBeNull();
    expect(await fetchRoadRoute(A, B)).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('réponse malformée : null (jamais de valeur inventée)', async () => {
    const { fetchRoadRoute } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('pas du json', { status: 200 })),
    );
    expect(await fetchRoadRoute(A, B)).toBeNull();
  });

  it('réseau coupé : échec propre', async () => {
    const { fetchRoadRoute } = await load(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await fetchRoadRoute(A, B)).toBeNull();
  });
});

describe('comparePair — surcharge de distance serveur', () => {
  it('applique la distance en direct quand elle est fournie', () => {
    const base = comparePair('cocody', 'plateau', 'PRICE_TIME');
    const over = comparePair('cocody', 'plateau', 'PRICE_TIME', 12.34);
    expect(over?.corridor.km).toBe(12.3);
    expect(base?.corridor.km).not.toBe(12.3);
  });

  it('ignore une distance invalide (repli matrice)', () => {
    const base = comparePair('cocody', 'plateau', 'PRICE_TIME');
    for (const mauvaise of [Number.NaN, 0, -4, Number.POSITIVE_INFINITY]) {
      expect(comparePair('cocody', 'plateau', 'PRICE_TIME', mauvaise)?.corridor.km).toBe(
        base?.corridor.km,
      );
    }
  });

  it('ne fabrique jamais un trajet vers soi-même, même avec une distance', () => {
    expect(comparePair('cocody', 'cocody', 'PRICE_TIME', 5)).toBeNull();
  });
});
