import { describe, expect, it } from 'vitest';
import { cleanLineName, dedupeLines } from '@/features/transit/lignes';

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
