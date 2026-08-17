import { describe, expect, it } from 'vitest';
import {
  cleanLineName,
  dedupeCorrespondances,
  dedupeLines,
  fmtWalk,
  totalWalkM,
  traceSegments,
} from '@/features/transit/lignes';

/**
 * Lignes cartographiées : le nom s'affiche sans son préfixe de mode (la
 * pastille le porte), et les allers-retours fusionnent en une ligne.
 */

describe('cleanLineName', () => {
  it('retire le préfixe de mode', () => {
    expect(cleanLineName('gbaka : Adjamé Liberté → Carrefour Lokoa')).toBe(
      'Adjamé Liberté → Carrefour Lokoa',
    );
    expect(cleanLineName('woro-woro : Angré → Cocody')).toBe('Angré → Cocody');
    expect(cleanLineName('bus 27 : Gare Sud → Niangon')).toBe('Gare Sud → Niangon');
  });

  it('laisse intact un nom sans préfixe', () => {
    expect(cleanLineName('Ligne Express Bingerville')).toBe('Ligne Express Bingerville');
  });

  it('gère la variante « woro woro banalisé : … »', () => {
    expect(cleanLineName('woro woro banalisé : Carrefour Angré → Bacongo')).toBe(
      'Carrefour Angré → Bacongo',
    );
  });
});

describe('dedupeCorrespondances', () => {
  const base = {
    mode1: 'WORO',
    ref1: '',
    montee_m: 343,
    mode2: 'WORO',
    ref2: '',
    descente_m: 295,
    correspondance_m: 7,
  };

  it('fusionne les variantes aller/retour de la seconde étape', () => {
    const uniques = dedupeCorrespondances([
      { ...base, ligne1: 'woro woro : Angré → Bacongo', ligne2: 'woro woro : Gare → Soweto' },
      { ...base, ligne1: 'woro woro : Angré → Bacongo', ligne2: 'woro woro : Soweto → Gare' },
    ]);
    expect(uniques).toHaveLength(1);
  });

  it('garde deux correspondances réellement différentes', () => {
    const uniques = dedupeCorrespondances([
      { ...base, ligne1: 'woro woro : Angré → Bacongo', ligne2: 'woro woro : Gare → Soweto' },
      {
        ...base,
        ligne1: 'bus 205 : Gare Sud → Angré Djibi',
        ligne2: 'bus 33 : Gare Sud → Koumassi',
      },
    ]);
    expect(uniques).toHaveLength(2);
  });
});

describe('dedupeLines', () => {
  it('fusionne aller et retour en une seule ligne', () => {
    const lignes = dedupeLines([
      { nom: 'bus 27 : Gare Sud → Yopougon Niangon', mode: 'BUS', ref: '27' },
      { nom: 'bus 27 : Yopougon Niangon → Gare Sud', mode: 'BUS', ref: '27' },
      { nom: 'gbaka : Adjamé → Lokoa', mode: 'GBAKA', ref: '' },
    ]);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]!.ref).toBe('27');
  });

  it('ne fusionne pas deux lignes différentes du même mode', () => {
    const lignes = dedupeLines([
      { nom: 'gbaka : Adjamé → Lokoa', mode: 'GBAKA', ref: '' },
      { nom: 'gbaka : Adjamé → Niangon', mode: 'GBAKA', ref: '' },
    ]);
    expect(lignes).toHaveLength(2);
  });
});

describe('fmtWalk — marche affichée sans fausse précision', () => {
  it('arrondit au pas de 50 m, plancher 50 m', () => {
    expect(fmtWalk(118)).toBe('~100 m');
    expect(fmtWalk(304)).toBe('~300 m');
    expect(fmtWalk(12)).toBe('~50 m');
  });

  it('passe en kilomètres au-delà de 1 000 m', () => {
    expect(fmtWalk(1180)).toBe('~1,2 km');
  });

  it('valeur absente ou invalide : null (rien d’affiché)', () => {
    expect(fmtWalk(undefined)).toBeNull();
    expect(fmtWalk(-5)).toBeNull();
  });
});

describe('traceSegments — la charnière aller/retour ne traverse pas la ville', () => {
  it('coupe au saut de plus de 2 km (relations OSM aller + retour)', () => {
    const aller: [number, number][] = [
      [5.4, -3.98],
      [5.401, -3.985],
      [5.402, -3.99],
    ];
    const retour: [number, number][] = [
      [5.32, -4.02],
      [5.321, -4.015],
    ];
    const segments = traceSegments([...aller, ...retour]);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(3);
    expect(segments[1]).toHaveLength(2);
  });

  it('tracé continu : un seul segment', () => {
    const segments = traceSegments([
      [5.4, -3.98],
      [5.405, -3.985],
      [5.41, -3.99],
    ]);
    expect(segments).toHaveLength(1);
  });

  it('point isolé après coupe : ignoré (pas de segment à un point)', () => {
    const segments = traceSegments([
      [5.4, -3.98],
      [5.401, -3.985],
      [5.32, -4.02],
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(2);
  });
});

describe('totalWalkM — « meilleure ligne » seulement sur mesure complète', () => {
  it('additionne montée et descente', () => {
    expect(totalWalkM({ montee_m: 48, descente_m: 203 })).toBe(251);
  });

  it('demi-mesure : null (pas de proclamation sur une donnée partielle)', () => {
    expect(totalWalkM({ montee_m: 48 })).toBeNull();
    expect(totalWalkM({ descente_m: 203 })).toBeNull();
    expect(totalWalkM({})).toBeNull();
  });
});
