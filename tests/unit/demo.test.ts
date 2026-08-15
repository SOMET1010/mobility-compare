import { describe, it, expect } from 'vitest';
import {
  COMMUNES,
  CORRIDORS,
  comparePair,
  estimateCo2Grams,
  getComparison,
  MODE_META,
  pairDistanceKm,
} from '@/demo/scenario';
import { DEMO_ROUTING_PROVIDER } from '@/demo/simulation';

/**
 * Le mode Démonstration alimente les MOTEURS RÉELS (tarification + classement)
 * avec des données fictives. Ces tests prouvent que la démo passe bien par le
 * vrai domaine et reste honnête : aucune observation, confiance 0, routage
 * marqué « simulation », classement neutre et déterministe.
 */

describe('mode démonstration — passe par les moteurs réels', () => {
  it('produit une comparaison pour chaque corridor fictif', () => {
    for (const c of CORRIDORS) {
      const cmp = getComparison(c.id);
      expect(cmp, c.id).not.toBeNull();
      expect(cmp!.options).toHaveLength(c.legs.length);
    }
  });

  it('un identifiant de corridor inconnu donne une absence, pas une invention', () => {
    expect(getComparison('inexistant')).toBeNull();
  });

  it('chaque prix vient du moteur réel et reste NON validé (confiance 0, routage simulé)', () => {
    const cmp = getComparison('cocody-plateau')!;
    for (const opt of cmp.options) {
      expect(opt.fare.available, opt.optionId).toBe(true);
      if (opt.fare.available) {
        expect(opt.fare.trace.confidenceScore).toBe(0);
        expect(opt.fare.trace.observationCount).toBe(0);
        expect(opt.fare.trace.routingProvider).toBe(DEMO_ROUTING_PROVIDER);
        // La trace détaille le calcul (invariant I2) et se termine par le total.
        expect(opt.fare.trace.steps.length).toBeGreaterThan(0);
        expect(opt.fare.trace.steps.at(-1)!.label).toBe('Total');
      }
    }
  });

  it('émet les trois badges neutres, calculés par le vrai classement', () => {
    const cmp = getComparison('cocody-plateau')!;
    const codes = cmp.ranking.badges.map((b) => b.code).sort();
    expect(codes).toEqual(['BEST_VALUE', 'CHEAPEST', 'FASTEST']);
    // chaque badge cite une option réellement présente
    const ids = new Set(cmp.options.map((o) => o.optionId));
    for (const b of cmp.ranking.badges) expect(ids.has(b.optionId)).toBe(true);
  });

  it('le supplément aéroport apparaît dans la trace (frais fixe)', () => {
    const cmp = getComparison('marcory-aeroport')!;
    const vtc = cmp.options.find((o) => o.mode === 'VTC')!;
    expect(vtc.fare.available).toBe(true);
    if (vtc.fare.available) {
      const labels = vtc.fare.trace.steps.map((s) => s.label);
      expect(labels).toContain('Supplément aéroport (exemple)');
    }
  });

  it('est déterministe : deux constructions identiques donnent le même résultat', () => {
    const a = getComparison('yopougon-adjame')!;
    const b = getComparison('yopougon-adjame')!;
    const amounts = (c: typeof a) =>
      c.ranking.ranked.map((r) => `${r.option.optionId}:${r.sortValue}`);
    expect(amounts(a)).toEqual(amounts(b));
  });

  it('couvre les quatre modes attendus', () => {
    const cmp = getComparison('cocody-plateau')!;
    const modes = cmp.options.map((o) => o.mode).sort();
    expect(modes).toEqual(['GBAKA', 'TAXI', 'VTC', 'WORO']);
    for (const m of modes) expect(MODE_META[m]).toBeDefined();
  });

  it('propose huit corridors d’exemple', () => {
    expect(CORRIDORS).toHaveLength(8);
  });
});

describe('mode démonstration — le critère de tri change le classement', () => {
  it('tri par prix : ordre croissant du prix, sans badge « meilleur rapport »', () => {
    const cmp = getComparison('cocody-plateau', 'PRICE')!;
    const prices = cmp.ranking.ranked.map((r) => r.sortValue);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
    // BEST_VALUE n'a de sens qu'avec une valeur du temps : absent hors compromis.
    expect(cmp.ranking.badges.some((b) => b.code === 'BEST_VALUE')).toBe(false);
  });

  it('tri par durée : ordre croissant de la durée', () => {
    const cmp = getComparison('cocody-plateau', 'DURATION')!;
    const durs = cmp.ranking.ranked.map((r) => r.sortValue);
    const sorted = [...durs].sort((a, b) => a - b);
    expect(durs).toEqual(sorted);
  });

  it('compromis : émet bien le badge « meilleur rapport »', () => {
    const cmp = getComparison('cocody-plateau', 'PRICE_TIME')!;
    expect(cmp.ranking.badges.some((b) => b.code === 'BEST_VALUE')).toBe(true);
  });
});

describe('recherche libre origine → destination (simulée, sans OSRM)', () => {
  it('compare n’importe quelle paire de communes via les moteurs réels', () => {
    const cmp = comparePair('yopougon', 'bingerville')!;
    expect(cmp).not.toBeNull();
    expect(cmp.options).toHaveLength(4);
    for (const opt of cmp.options) {
      expect(opt.fare.available).toBe(true);
      if (opt.fare.available) {
        expect(opt.fare.trace.confidenceScore).toBe(0);
        expect(opt.fare.trace.routingProvider).toBe(DEMO_ROUTING_PROVIDER);
      }
    }
    expect(cmp.ranking.badges.map((b) => b.code).sort()).toEqual([
      'BEST_VALUE',
      'CHEAPEST',
      'FASTEST',
    ]);
  });

  it('même origine et destination → absence (pas d’invention)', () => {
    expect(comparePair('cocody', 'cocody')).toBeNull();
    expect(pairDistanceKm('cocody', 'cocody')).toBeNull();
  });

  it('une commune inconnue → absence', () => {
    expect(comparePair('cocody', 'atlantide')).toBeNull();
    expect(pairDistanceKm('atlantide', 'cocody')).toBeNull();
  });

  it('la distance estimée est positive et symétrique', () => {
    const ab = pairDistanceKm('yopougon', 'koumassi');
    const ba = pairDistanceKm('koumassi', 'yopougon');
    expect(ab).not.toBeNull();
    expect(ab!).toBeGreaterThan(0);
    expect(ab).toBe(ba);
  });

  it('est déterministe : deux comparaisons identiques donnent le même résultat', () => {
    const a = comparePair('abobo', 'marcory', 'PRICE')!;
    const b = comparePair('abobo', 'marcory', 'PRICE')!;
    const key = (c: typeof a) => c.ranking.ranked.map((r) => `${r.option.mode}:${r.sortValue}`);
    expect(key(a)).toEqual(key(b));
  });

  it('un trajet vers l’aéroport porte le supplément dans la trace (modes au compteur)', () => {
    const cmp = comparePair('cocody', 'aeroport')!;
    const vtc = cmp.options.find((o) => o.mode === 'VTC')!;
    expect(vtc.fare.available).toBe(true);
    if (vtc.fare.available) {
      const labels = vtc.fare.trace.steps.map((s) => s.label);
      expect(labels).toContain('Supplément aéroport (exemple)');
    }
  });

  it('tri par prix : ordre croissant', () => {
    const cmp = comparePair('plateau', 'abobo', 'PRICE')!;
    const prices = cmp.ranking.ranked.map((r) => r.sortValue);
    expect(prices).toEqual([...prices].sort((x, y) => x - y));
  });

  it('propose un jeu de communes cohérent (au moins 10, identifiants uniques)', () => {
    expect(COMMUNES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(COMMUNES.map((c) => c.id)).size).toBe(COMMUNES.length);
  });
});

describe('empreinte carbone — estimation indicative', () => {
  it('croît avec la distance et reste déterministe', () => {
    expect(estimateCo2Grams('VTC', 10)).toBe(1800);
    expect(estimateCo2Grams('VTC', 20)).toBe(3600);
  });

  it('les modes partagés émettent moins par passager que la voiture solo', () => {
    const km = 12;
    const vtc = estimateCo2Grams('VTC', km);
    const taxi = estimateCo2Grams('TAXI', km);
    const woro = estimateCo2Grams('WORO', km);
    const gbaka = estimateCo2Grams('GBAKA', km);
    expect(gbaka).toBeLessThan(woro);
    expect(woro).toBeLessThan(taxi);
    expect(taxi).toBeLessThan(vtc);
  });
});
