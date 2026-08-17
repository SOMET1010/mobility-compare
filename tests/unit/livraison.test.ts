import { describe, expect, it } from 'vitest';
import { comparePair, comparePoints, MODE_META, SERVICE_MODES } from '@/demo/scenario';

/**
 * Livraison de colis : mêmes moteurs que les courses (tarif tracé,
 * classement neutre), modes différents. Les prix restent des estimations
 * d'exemple — c'est le bandeau pilote qui le dit à l'écran.
 */

describe('comparateur livraison', () => {
  it('propose les trois modes colis, tous chiffrés et classés', () => {
    const cmp = comparePair('cocody', 'plateau', 'PRICE_TIME', undefined, 'LIVRAISON');
    expect(cmp).not.toBeNull();
    const modes = cmp!.options.map((o) => o.mode).sort();
    expect(modes).toEqual([...SERVICE_MODES.LIVRAISON].sort());
    for (const o of cmp!.options) expect(o.fare.available).toBe(true);
    expect(cmp!.ranking.ranked).toHaveLength(3);
  });

  it('sans service précisé : les quatre modes passagers, comme avant', () => {
    const cmp = comparePair('cocody', 'plateau');
    expect(cmp!.options.map((o) => o.mode).sort()).toEqual(['GBAKA', 'TAXI', 'VTC', 'WORO']);
  });

  it('le moto-coursier coûte moins cher que le coursier voiture', () => {
    const cmp = comparePair('yopougon', 'adjame', 'PRICE', undefined, 'LIVRAISON');
    const prix = new Map(
      cmp!.options.map((o) => [o.mode, o.fare.available ? o.fare.value.amount : null]),
    );
    expect(prix.get('MOTO')!).toBeLessThan(prix.get('CARGO')!);
  });

  it('fonctionne aussi entre points libres (adresses)', () => {
    const cmp = comparePoints('Rue des Jardins', 'Marché de Marcory', 8.4, 'PRICE', 'LIVRAISON');
    expect(cmp).not.toBeNull();
    expect(cmp!.options).toHaveLength(3);
  });

  it('chaque mode livraison a sa fiche méta complète', () => {
    for (const mode of SERVICE_MODES.LIVRAISON) {
      const m = MODE_META[mode];
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.note.length).toBeGreaterThan(0);
      expect(m.color).toMatch(/^#/);
    }
  });
});
