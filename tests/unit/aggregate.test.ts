import { describe, expect, it } from 'vitest';
import {
  aggregateByMode,
  MEDIAN_MIN_OBSERVATIONS,
  median,
  type ObservationRow,
} from '@/features/contributions/aggregate';

const row = (mode: ObservationRow['mode'], price: number, at = '2026-08-15T10:00:00Z') => ({
  mode,
  price_xof: price,
  observed_at: at,
});

describe('médiane', () => {
  it('null sur liste vide — jamais une valeur inventée', () => {
    expect(median([])).toBeNull();
  });

  it('valeur centrale sur effectif impair', () => {
    expect(median([300, 100, 200])).toBe(200);
  });

  it('moyenne des deux centrales sur effectif pair', () => {
    expect(median([100, 200, 300, 400])).toBe(250);
  });

  it('arrondit à l’entier (FCFA sans subdivision)', () => {
    expect(median([100, 201])).toBe(151);
  });

  it('insensible aux extrêmes (contrairement à la moyenne)', () => {
    expect(median([500, 500, 500, 500, 99000])).toBe(500);
  });
});

describe('agrégat par mode — seuil honnête', () => {
  it(`pas de médiane sous ${MEDIAN_MIN_OBSERVATIONS} relevés, mais le compte reste visible`, () => {
    const agg = aggregateByMode([row('VTC', 450)]);
    expect(agg.VTC).toEqual({
      count: 1,
      medianXof: null,
      latestAt: '2026-08-15T10:00:00Z',
    });
  });

  it(`médiane affichée à partir de ${MEDIAN_MIN_OBSERVATIONS} relevés`, () => {
    const rows = [1500, 1600, 1400, 2000, 1550].map((p) => row('VTC', p));
    expect(aggregateByMode(rows).VTC).toMatchObject({ count: 5, medianXof: 1550 });
  });

  it('sépare les modes — la médiane du gbaka ne contamine pas le VTC', () => {
    const rows = [...[300, 300, 350, 300, 400].map((p) => row('GBAKA', p)), row('VTC', 2000)];
    const agg = aggregateByMode(rows);
    expect(agg.GBAKA).toMatchObject({ count: 5, medianXof: 300 });
    expect(agg.VTC).toMatchObject({ count: 1, medianXof: null });
    expect(agg.TAXI).toBeUndefined();
  });

  it('trace la fraîcheur : date du relevé le plus récent', () => {
    const agg = aggregateByMode([
      row('WORO', 300, '2026-08-10T08:00:00Z'),
      row('WORO', 350, '2026-08-14T18:00:00Z'),
      row('WORO', 300, '2026-08-12T12:00:00Z'),
    ]);
    expect(agg.WORO?.latestAt).toBe('2026-08-14T18:00:00Z');
  });
});
