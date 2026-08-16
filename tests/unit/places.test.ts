import { describe, expect, it } from 'vitest';
import { COMMUNES, pairDistanceKm, placeGroups } from '@/demo/scenario';

/**
 * Lieux du comparateur : identifiants uniques, positions dans l'agglomération
 * d'Abidjan (garde-fou contre une coordonnée fantaisiste), regroupement par
 * commune complet — chaque lieu appartient à un groupe affiché.
 */
describe('lieux — communes et quartiers', () => {
  it('identifiants uniques', () => {
    const ids = COMMUNES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('positions dans la boîte englobante du Grand Abidjan', () => {
    for (const c of COMMUNES) {
      expect(c.lat, c.id).toBeGreaterThan(5.2);
      expect(c.lat, c.id).toBeLessThan(5.55);
      expect(c.lng, c.id).toBeGreaterThan(-4.2);
      expect(c.lng, c.id).toBeLessThan(-3.8);
    }
  });

  it('chaque lieu appartient à un groupe affiché', () => {
    const shown = new Set(placeGroups().flatMap((g) => g.places.map((p) => p.id)));
    for (const c of COMMUNES) expect(shown.has(c.id), c.id).toBe(true);
  });

  it('deux quartiers de la même commune donnent un trajet court mais non nul', () => {
    const km = pairDistanceKm('angre', 'riviera');
    expect(km).not.toBeNull();
    expect(km!).toBeGreaterThan(1);
    expect(km!).toBeLessThan(10);
  });

  it('quartier → quartier traverse la ville avec une distance plausible', () => {
    const km = pairDistanceKm('niangon', 'bietry');
    expect(km).not.toBeNull();
    expect(km!).toBeGreaterThan(8);
    expect(km!).toBeLessThan(30);
  });
});
