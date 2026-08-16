import { describe, expect, it } from 'vitest';
import { searchPlaces } from '@/features/search/placeSearch';

/**
 * Recherche de lieu en tapant : accents ignorés, classement par pertinence
 * (début du nom > mot du nom > contenu > commune), jamais de résultat
 * hors des 29 lieux connus.
 */

describe('searchPlaces', () => {
  it('saisie vide : aucun résultat (la liste groupée prend le relais)', () => {
    expect(searchPlaces('')).toEqual([]);
    expect(searchPlaces('   ')).toEqual([]);
  });

  it('« yop » : les lieux de Yopougon, le nom exact en tête', () => {
    const hits = searchPlaces('yop');
    expect(hits[0]!.id).toBe('yopougon');
    expect(hits.map((h) => h.id)).toContain('siporex');
  });

  it('accents ignorés : « adjame » trouve Adjamé, « aeroport » trouve l’aéroport', () => {
    expect(searchPlaces('adjame')[0]!.id).toBe('adjame');
    expect(searchPlaces('aeroport')[0]!.id).toBe('aeroport');
  });

  it('tirets ignorés : « deux plateaux » trouve Deux-Plateaux', () => {
    expect(searchPlaces('deux plateaux')[0]!.id).toBe('deux-plateaux');
  });

  it('mot intérieur : « golf » trouve Riviera Golf', () => {
    expect(searchPlaces('golf')[0]!.id).toBe('riviera-golf');
  });

  it('nom de commune : « cocody » liste aussi ses quartiers', () => {
    const ids = searchPlaces('cocody', 20).map((h) => h.id);
    expect(ids[0]).toBe('cocody');
    expect(ids).toContain('angre');
    expect(ids).toContain('riviera');
  });

  it('préfixe de nom avant nom de commune : « bie » → Biétry avant tout', () => {
    expect(searchPlaces('bie')[0]!.id).toBe('bietry');
  });

  it('saisie inconnue : liste vide, jamais d’invention', () => {
    expect(searchPlaces('oslo')).toEqual([]);
  });

  it('limite respectée', () => {
    expect(searchPlaces('a', 3)).toHaveLength(3);
  });
});
