import { describe, expect, it } from 'vitest';
import { comparePair, comparePoints, MODE_META, SERVICE_MODES, waitMinFor } from '@/demo/scenario';

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

describe('waitMinFor — l’attente est un profil horaire, pas une constante', () => {
  const pointe = new Date('2026-08-17T08:00:00'); // pointe du matin (heure locale)
  const nuit = new Date('2026-08-17T23:30:00'); // nuit
  const creux = new Date('2026-08-17T10:30:00'); // matinée dense (facteur 1)

  it('à la pointe : les partagés se remplissent vite, les réservés se font attendre', () => {
    expect(waitMinFor('WORO', pointe)).toBeLessThan(waitMinFor('WORO', creux));
    expect(waitMinFor('GBAKA', pointe)).toBeLessThan(waitMinFor('GBAKA', creux));
    expect(waitMinFor('VTC', pointe)).toBeGreaterThan(waitMinFor('VTC', creux));
    expect(waitMinFor('TAXI', pointe)).toBeGreaterThan(waitMinFor('TAXI', creux));
  });

  it('la nuit : c’est l’inverse — remplissage long, chauffeurs rares', () => {
    expect(waitMinFor('WORO', nuit)).toBeGreaterThan(waitMinFor('WORO', creux));
    expect(waitMinFor('VTC', nuit)).toBeGreaterThan(waitMinFor('VTC', creux));
  });

  it('jamais zéro ni négatif — une attente nulle serait un mensonge', () => {
    for (const m of ['VTC', 'TAXI', 'WORO', 'GBAKA', 'MOTO', 'TRICYCLE', 'CARGO'] as const) {
      expect(waitMinFor(m, pointe)).toBeGreaterThanOrEqual(1);
      expect(waitMinFor(m, nuit)).toBeGreaterThanOrEqual(1);
    }
  });
});
