import { describe, expect, it } from 'vitest';
import { groupByCorridor, type CorridorRow } from '@/features/contributions/observatory';

const row = (
  from: string,
  to: string,
  mode: CorridorRow['mode'],
  price: number,
  at = '2026-08-15T10:00:00Z',
): CorridorRow => ({
  from_commune: from,
  to_commune: to,
  mode,
  price_xof: price,
  observed_at: at,
});

describe('observatoire — regroupement par corridor', () => {
  it('vide sur aucune donnée', () => {
    expect(groupByCorridor([])).toEqual([]);
  });

  it('regroupe par corridor en conservant le sens (A→B ≠ B→A)', () => {
    const stats = groupByCorridor([
      row('cocody', 'plateau', 'VTC', 2000),
      row('plateau', 'cocody', 'VTC', 1800),
    ]);
    expect(stats).toHaveLength(2);
  });

  it('trie par volume décroissant, puis par clé stable', () => {
    const stats = groupByCorridor([
      row('cocody', 'plateau', 'VTC', 2000),
      row('abobo', 'adjame', 'GBAKA', 300),
      row('abobo', 'adjame', 'WORO', 350),
    ]);
    expect(stats[0]!.fromId).toBe('abobo');
    expect(stats[0]!.total).toBe(2);
    expect(stats[1]!.fromId).toBe('cocody');
  });

  it('agrège par mode à l’intérieur du corridor (seuil de médiane hérité)', () => {
    const stats = groupByCorridor([
      ...[300, 300, 350, 300, 400].map((p) => row('abobo', 'adjame', 'GBAKA', p)),
      row('abobo', 'adjame', 'WORO', 350),
    ]);
    const corridor = stats[0]!;
    expect(corridor.total).toBe(6);
    expect(corridor.byMode.GBAKA).toMatchObject({ count: 5, medianXof: 300 });
    expect(corridor.byMode.WORO).toMatchObject({ count: 1, medianXof: null });
  });

  it('trace la fraîcheur du corridor (relevé le plus récent)', () => {
    const stats = groupByCorridor([
      row('cocody', 'plateau', 'VTC', 2000, '2026-08-10T08:00:00Z'),
      row('cocody', 'plateau', 'TAXI', 2500, '2026-08-14T18:00:00Z'),
    ]);
    expect(stats[0]!.latestAt).toBe('2026-08-14T18:00:00Z');
  });
});
