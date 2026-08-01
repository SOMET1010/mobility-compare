import { describe, it, expect } from 'vitest';
import { CORRIDORS, getComparison, MODE_META } from '@/demo/scenario';
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
