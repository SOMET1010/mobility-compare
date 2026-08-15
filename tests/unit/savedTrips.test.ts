import { describe, expect, it } from 'vitest';
import {
  isFavorite,
  loadFavorites,
  loadRecents,
  MAX_FAVORITES,
  MAX_RECENTS,
  pushRecent,
  toggleFavorite,
} from '@/features/trips/savedTrips';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

const trip = (fromId: string, toId: string) => ({ fromId, toId });

describe('trajets récents — hors-ligne, borné, dédoublonné', () => {
  it('vide par défaut', () => {
    expect(loadRecents(fakeStorage())).toEqual([]);
  });

  it('ajoute en tête et dédoublonne', () => {
    const s = fakeStorage();
    pushRecent(s, trip('cocody', 'plateau'));
    pushRecent(s, trip('abobo', 'adjame'));
    pushRecent(s, trip('cocody', 'plateau'));
    expect(loadRecents(s).map((t) => t.fromId)).toEqual(['cocody', 'abobo']);
  });

  it(`borne à ${MAX_RECENTS} entrées`, () => {
    const s = fakeStorage();
    for (let i = 0; i < MAX_RECENTS + 3; i++) pushRecent(s, trip(`c${i}`, 'plateau'));
    expect(loadRecents(s)).toHaveLength(MAX_RECENTS);
    expect(loadRecents(s)[0]!.fromId).toBe(`c${MAX_RECENTS + 2}`);
  });

  it('résiste à un stockage corrompu', () => {
    const s = fakeStorage();
    s.setItem('mobilis.recent-trips.v1', '{pas une liste');
    expect(loadRecents(s)).toEqual([]);
    s.setItem('mobilis.recent-trips.v1', JSON.stringify([{ fromId: 1 }, trip('a', 'b')]));
    expect(loadRecents(s)).toEqual([trip('a', 'b')]);
  });
});

describe('favoris — bascule, borné', () => {
  it('ajoute puis retire au second appel', () => {
    const s = fakeStorage();
    toggleFavorite(s, trip('cocody', 'plateau'));
    expect(isFavorite(s, trip('cocody', 'plateau'))).toBe(true);
    toggleFavorite(s, trip('cocody', 'plateau'));
    expect(isFavorite(s, trip('cocody', 'plateau'))).toBe(false);
    expect(loadFavorites(s)).toEqual([]);
  });

  it('distingue le sens du trajet (A→B ≠ B→A)', () => {
    const s = fakeStorage();
    toggleFavorite(s, trip('cocody', 'plateau'));
    expect(isFavorite(s, trip('plateau', 'cocody'))).toBe(false);
  });

  it(`borne à ${MAX_FAVORITES} favoris`, () => {
    const s = fakeStorage();
    for (let i = 0; i < MAX_FAVORITES + 2; i++) toggleFavorite(s, trip(`c${i}`, 'plateau'));
    expect(loadFavorites(s)).toHaveLength(MAX_FAVORITES);
  });
});
