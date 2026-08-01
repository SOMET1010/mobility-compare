import { describe, it, expect } from 'vitest';
import { rankOptions, type RankableOption } from '@/domain/ranking';
import type { Estimation } from '@/domain/result';
import type { FareResult } from '@/domain/pricing/dynamic';
import { xof } from '@/domain/pricing/money';

/** Prix disponible, avec trace minimale. */
function fare(amount: number, confidence = 0): Estimation<FareResult> {
  return {
    available: true,
    value: {
      amount: xof(amount),
      currency: 'XOF',
      gridVersion: 'test',
      providerId: 'p',
      basis: 'OBSERVED',
      multiplier: {
        raw: 1,
        applied: 1,
        capped: false,
        capReason: null,
        compositionMode: 'MULTIPLICATIVE',
        compositionStatus: 'UNVALIDATED',
      },
      minimumApplied: false,
      policiesApplied: { multiplierComposition: 'UNVALIDATED', taxBase: 'UNVALIDATED' },
    },
    trace: {
      steps: [],
      pricingModelVersion: 'test',
      routingProvider: 'fixture',
      distanceMeters: 10_000,
      durationSeconds: 1_200,
      observationCount: 0,
      oldestObservationAt: null,
      confidenceScore: confidence,
    },
  };
}

const absent: Estimation<FareResult> = { available: false, reason: 'INSUFFICIENT_OBSERVATIONS' };

function option(
  optionId: string,
  amount: number | null,
  durationSeconds: number | null,
  extra: Partial<RankableOption> = {},
): RankableOption {
  return {
    optionId,
    providerId: `provider-${optionId}`,
    mode: 'VTC',
    fare: amount === null ? absent : fare(amount),
    durationSeconds,
    waitSeconds: null,
    ...extra,
  };
}

// =============================================================================
describe('tri par prix', () => {
  it('classe du moins cher au plus cher', () => {
    const result = rankOptions(
      [option('c', 4000, 1200), option('a', 2000, 1500), option('b', 3000, 1000)],
      { criterion: 'PRICE' },
    );
    expect(result.ranked.map((r) => r.option.optionId)).toEqual(['a', 'b', 'c']);
    expect(result.ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('expose la valeur de tri et sa formule', () => {
    const result = rankOptions([option('a', 2000, 1200), option('b', 3000, 1200)], {
      criterion: 'PRICE',
    });
    expect(result.ranked[0]!.sortValue).toBe(2000);
    expect(result.ranked[0]!.sortExplanation).toBe('2000 FCFA');
  });
});

describe('tri par durée', () => {
  it('classe du plus rapide au plus lent', () => {
    const result = rankOptions(
      [option('a', 2000, 1800), option('b', 3000, 900), option('c', 4000, 1200)],
      { criterion: 'DURATION' },
    );
    expect(result.ranked.map((r) => r.option.optionId)).toEqual(['b', 'c', 'a']);
  });

  it("n'inclut pas l'attente par défaut", () => {
    const result = rankOptions(
      [option('a', 2000, 600, { waitSeconds: 1200 }), option('b', 2000, 900, { waitSeconds: 0 })],
      { criterion: 'DURATION' },
    );
    expect(result.ranked[0]!.option.optionId).toBe('a');
  });

  it("inclut l'attente quand on le demande, et l'ordre change", () => {
    const result = rankOptions(
      [option('a', 2000, 600, { waitSeconds: 1200 }), option('b', 2000, 900, { waitSeconds: 0 })],
      { criterion: 'DURATION', includeWaitInDuration: true },
    );
    expect(result.ranked[0]!.option.optionId).toBe('b');
    expect(result.ranked[0]!.sortExplanation).toContain('trajet + attente');
  });
});

describe('tri prix/temps — pondération explicite', () => {
  it('refuse de classer sans valeur du temps', () => {
    expect(() => rankOptions([option('a', 2000, 1200)], { criterion: 'PRICE_TIME' })).toThrow(
      /valeur du temps/,
    );
  });

  it('refuse une valeur du temps nulle ou négative', () => {
    for (const value of [0, -10]) {
      expect(() =>
        rankOptions([option('a', 2000, 1200)], {
          criterion: 'PRICE_TIME',
          timeValueXofPerMinute: value,
        }),
      ).toThrow();
    }
  });

  it('combine prix et durée selon la valeur du temps', () => {
    // a : 3000 + 50 x 10 = 3500  |  b : 2000 + 50 x 40 = 4000
    const result = rankOptions([option('a', 3000, 600), option('b', 2000, 2400)], {
      criterion: 'PRICE_TIME',
      timeValueXofPerMinute: 50,
    });
    expect(result.ranked[0]!.option.optionId).toBe('a');
    expect(result.ranked[0]!.sortValue).toBe(3500);
  });

  it('la valeur du temps change le classement — la pondération est décisive', () => {
    const options = [option('a', 3000, 600), option('b', 2000, 2400)];
    const patient = rankOptions(options, { criterion: 'PRICE_TIME', timeValueXofPerMinute: 5 });
    const presse = rankOptions(options, { criterion: 'PRICE_TIME', timeValueXofPerMinute: 200 });
    expect(patient.ranked[0]!.option.optionId).toBe('b');
    expect(presse.ranked[0]!.option.optionId).toBe('a');
  });

  it('rend la formule vérifiable à la main', () => {
    const result = rankOptions([option('a', 3000, 600), option('b', 2000, 2400)], {
      criterion: 'PRICE_TIME',
      timeValueXofPerMinute: 50,
    });
    expect(result.ranked[0]!.sortExplanation).toBe('3000 FCFA + 50 FCFA/min x 10.0 min = 3500');
  });
});

// =============================================================================
describe('absence honnête — les options non classables ne sont pas reléguées', () => {
  it("une option sans prix n'apparaît pas dans le classement par prix", () => {
    const result = rankOptions([option('a', 2000, 1200), option('b', null, 1200)], {
      criterion: 'PRICE',
    });
    expect(result.ranked.map((r) => r.option.optionId)).toEqual(['a']);
    expect(result.excluded.map((e) => e.option.optionId)).toEqual(['b']);
  });

  it("elle n'est pas placée en dernier : elle est ailleurs", () => {
    const result = rankOptions(
      [option('a', 2000, 1200), option('b', null, 1200), option('c', 5000, 1200)],
      { criterion: 'PRICE' },
    );
    // b n'occupe aucune position, pas même la dernière.
    expect(result.ranked.map((r) => r.option.optionId)).toEqual(['a', 'c']);
    expect(result.ranked.some((r) => r.option.optionId === 'b')).toBe(false);
  });

  it('chaque exclusion porte une raison exploitable', () => {
    const result = rankOptions([option('a', 2000, 1200), option('b', null, 1200)], {
      criterion: 'PRICE',
    });
    expect(result.excluded[0]!.reason).toBe('NO_FARE');
    expect(result.excluded[0]!.explanation).toContain('Prix indisponible');
  });

  it('une durée manquante exclut du tri par durée, pas du tri par prix', () => {
    const options = [option('a', 2000, null), option('b', 3000, 1200)];
    expect(rankOptions(options, { criterion: 'PRICE' }).ranked).toHaveLength(2);
    const byDuration = rankOptions(options, { criterion: 'DURATION' });
    expect(byDuration.ranked).toHaveLength(1);
    expect(byDuration.excluded[0]!.reason).toBe('NO_DURATION');
  });

  it('le seuil de confiance écarte une estimation trop incertaine', () => {
    const weak: RankableOption = { ...option('b', 2000, 1200), fare: fare(2000, 0.1) };
    const strong: RankableOption = { ...option('a', 3000, 1200), fare: fare(3000, 0.9) };
    const result = rankOptions([weak, strong], { criterion: 'PRICE', minimumConfidence: 0.5 });
    expect(result.ranked.map((r) => r.option.optionId)).toEqual(['a']);
    expect(result.excluded[0]!.reason).toBe('BELOW_CONFIDENCE_THRESHOLD');
  });

  it('aucune option classable : classement vide, pas de repli', () => {
    const result = rankOptions([option('a', null, 1200), option('b', null, 1200)], {
      criterion: 'PRICE',
    });
    expect(result.ranked).toHaveLength(0);
    expect(result.excluded).toHaveLength(2);
    expect(result.badges).toHaveLength(0);
  });
});

// =============================================================================
describe('badges — non achetables, non arbitraires', () => {
  it('attribue moins cher et plus rapide', () => {
    const result = rankOptions(
      [option('a', 2000, 1800), option('b', 5000, 600), option('c', 3000, 1200)],
      { criterion: 'PRICE' },
    );
    const byCode = Object.fromEntries(result.badges.map((b) => [b.code, b.optionId]));
    expect(byCode['CHEAPEST']).toBe('a');
    expect(byCode['FASTEST']).toBe('b');
  });

  it('un badge porte sa justification chiffrée', () => {
    const result = rankOptions([option('a', 2000, 1200), option('b', 5000, 600)], {
      criterion: 'PRICE',
    });
    const cheapest = result.badges.find((b) => b.code === 'CHEAPEST');
    expect(cheapest!.justification).toContain('2000 FCFA');
  });

  it("n'attribue aucun badge sur un ex aequo", () => {
    const result = rankOptions([option('a', 3000, 1200), option('b', 3000, 1200)], {
      criterion: 'PRICE',
    });
    expect(result.badges.find((b) => b.code === 'CHEAPEST')).toBeUndefined();
    expect(result.badges.find((b) => b.code === 'FASTEST')).toBeUndefined();
  });

  it("n'attribue aucun badge en dessous de deux options éligibles", () => {
    const result = rankOptions([option('a', 2000, 1200)], { criterion: 'PRICE' });
    expect(result.badges).toHaveLength(0);
    expect(result.insufficientForBadges).toBe(true);
  });

  it('les badges ne dépendent pas du critère de tri choisi', () => {
    const options = [option('a', 2000, 1800), option('b', 5000, 600)];
    const byPrice = rankOptions(options, { criterion: 'PRICE' });
    const byDuration = rankOptions(options, { criterion: 'DURATION' });
    const codes = (r: typeof byPrice) =>
      Object.fromEntries(r.badges.map((b) => [b.code, b.optionId]));
    expect(codes(byPrice)['CHEAPEST']).toBe('a');
    expect(codes(byDuration)['CHEAPEST']).toBe('a');
    expect(codes(byPrice)['FASTEST']).toBe('b');
    expect(codes(byDuration)['FASTEST']).toBe('b');
  });

  it("BEST_VALUE n'est émis qu'avec une valeur du temps explicite", () => {
    const options = [option('a', 2000, 1800), option('b', 5000, 600)];
    const sans = rankOptions(options, { criterion: 'PRICE' });
    const avec = rankOptions(options, {
      criterion: 'PRICE_TIME',
      timeValueXofPerMinute: 50,
    });
    expect(sans.badges.find((b) => b.code === 'BEST_VALUE')).toBeUndefined();
    expect(avec.badges.find((b) => b.code === 'BEST_VALUE')).toBeDefined();
  });

  it('un badge désigne toujours une option effectivement classée', () => {
    const result = rankOptions(
      [option('a', 2000, 1800), option('b', 5000, 600), option('c', null, 300)],
      { criterion: 'PRICE' },
    );
    const rankedIds = new Set(result.ranked.map((r) => r.option.optionId));
    for (const badge of result.badges) expect(rankedIds.has(badge.optionId)).toBe(true);
  });
});

// =============================================================================
describe('déterminisme', () => {
  it("départage les ex aequo par identifiant, jamais par ordre d'arrivée", () => {
    const a = option('alpha', 3000, 1200);
    const b = option('beta', 3000, 1200);
    const ordre1 = rankOptions([a, b], { criterion: 'PRICE' });
    const ordre2 = rankOptions([b, a], { criterion: 'PRICE' });
    expect(ordre1.ranked.map((r) => r.option.optionId)).toEqual(['alpha', 'beta']);
    expect(ordre2.ranked.map((r) => r.option.optionId)).toEqual(['alpha', 'beta']);
  });

  it('produit un résultat identique sur 100 exécutions', () => {
    const options = [
      option('a', 2000, 1800),
      option('b', 5000, 600),
      option('c', null, 300),
      option('d', 2000, 1200),
    ];
    const first = rankOptions(options, {
      criterion: 'PRICE_TIME',
      timeValueXofPerMinute: 50,
    });
    for (let i = 0; i < 100; i += 1) {
      expect(rankOptions(options, { criterion: 'PRICE_TIME', timeValueXofPerMinute: 50 })).toEqual(
        first,
      );
    }
  });

  it("ne modifie pas le tableau d'entrée", () => {
    const options = [option('c', 4000, 1200), option('a', 2000, 1500)];
    const snapshot = options.map((o) => o.optionId);
    rankOptions(options, { criterion: 'PRICE' });
    expect(options.map((o) => o.optionId)).toEqual(snapshot);
  });

  it('une liste vide donne un résultat vide, sans erreur', () => {
    const result = rankOptions([], { criterion: 'PRICE' });
    expect(result.ranked).toHaveLength(0);
    expect(result.badges).toHaveLength(0);
    expect(result.insufficientForBadges).toBe(true);
  });
});

// =============================================================================
describe('neutralité commerciale — invariant I3', () => {
  it("l'identité du fournisseur n'influence pas le classement", () => {
    const cher = { ...option('x', 5000, 600), providerId: 'partenaire-majeur' };
    const pasCher = { ...option('y', 2000, 600), providerId: 'inconnu' };
    const result = rankOptions([cher, pasCher], { criterion: 'PRICE' });
    expect(result.ranked[0]!.option.optionId).toBe('y');
    expect(result.badges.find((b) => b.code === 'CHEAPEST')!.optionId).toBe('y');
  });

  it("le résultat n'expose aucun champ commercial", () => {
    const result = rankOptions([option('a', 2000, 1200), option('b', 3000, 600)], {
      criterion: 'PRICE',
    });
    const serialized = JSON.stringify(result);
    for (const term of ['sponsor', 'promo', 'discount', 'commission', 'partner']) {
      expect(serialized.toLowerCase()).not.toContain(term);
    }
  });

  it('un champ commercial injecté dans une option ne change pas le classement', () => {
    const withNoise = {
      ...option('b', 3000, 600),
      sponsorBoost: 100,
      commission: 0.3,
    } as unknown as RankableOption;
    const clean = rankOptions([option('a', 2000, 1200), option('b', 3000, 600)], {
      criterion: 'PRICE',
    });
    const noisy = rankOptions([option('a', 2000, 1200), withNoise], { criterion: 'PRICE' });
    expect(noisy.ranked.map((r) => r.option.optionId)).toEqual(
      clean.ranked.map((r) => r.option.optionId),
    );
    expect(noisy.badges.map((b) => b.optionId)).toEqual(clean.badges.map((b) => b.optionId));
  });
});
