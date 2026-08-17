/**
 * Trajets favoris et récents — stockage local (exigence CDC « offline
 * partiel » : favoris et derniers résultats consultables hors connexion).
 *
 * Tout vit sur l'appareil (aucun serveur). Quand Supabase sera branché
 * (DEP-006), ces mêmes structures se synchroniseront avec le profil.
 */

export interface SavedTrip {
  readonly fromId: string;
  readonly toId: string;
  /**
   * Prestation du trajet : course (personnes) ou livraison (colis).
   * Absent sur les entrées enregistrées avant l'arrivée des livraisons —
   * lues comme des courses (migration silencieuse, audit externe F2).
   */
  readonly service?: 'COURSE' | 'LIVRAISON';
}

/** Service effectif d'une entrée, anciennes données comprises. */
export const tripService = (t: SavedTrip): 'COURSE' | 'LIVRAISON' => t.service ?? 'COURSE';

export const RECENTS_KEY = 'mobilis.recent-trips.v1';
export const FAVORITES_KEY = 'mobilis.favorite-trips.v1';

/** Bornes : assez pour être utile, trop peu pour devenir une base de données. */
export const MAX_RECENTS = 5;
export const MAX_FAVORITES = 20;

export const tripKey = (t: SavedTrip): string => `${t.fromId}→${t.toId}→${tripService(t)}`;

function loadList(storage: Pick<Storage, 'getItem'>, key: string): SavedTrip[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is SavedTrip =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as SavedTrip).fromId === 'string' &&
        typeof (t as SavedTrip).toId === 'string',
    );
  } catch {
    return [];
  }
}

function saveList(storage: Pick<Storage, 'setItem'>, key: string, list: SavedTrip[]): void {
  try {
    storage.setItem(key, JSON.stringify(list));
  } catch {
    /* stockage plein ou indisponible : l'app continue sans persistance */
  }
}

/* ---------------------------------------------------------------- récents */

export function loadRecents(storage: Pick<Storage, 'getItem'>): SavedTrip[] {
  return loadList(storage, RECENTS_KEY);
}

/**
 * Enregistre un trajet consulté : dédoublonné, le plus récent d'abord,
 * borné à MAX_RECENTS. Retourne la nouvelle liste.
 */
export function pushRecent(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  trip: SavedTrip,
): SavedTrip[] {
  const rest = loadRecents(storage).filter((t) => tripKey(t) !== tripKey(trip));
  const next = [trip, ...rest].slice(0, MAX_RECENTS);
  saveList(storage, RECENTS_KEY, next);
  return next;
}

/* ---------------------------------------------------------------- favoris */

export function loadFavorites(storage: Pick<Storage, 'getItem'>): SavedTrip[] {
  return loadList(storage, FAVORITES_KEY);
}

export function isFavorite(storage: Pick<Storage, 'getItem'>, trip: SavedTrip): boolean {
  return loadFavorites(storage).some((t) => tripKey(t) === tripKey(trip));
}

/**
 * Bascule un favori. Retourne la nouvelle liste (ajout en tête, borné à
 * MAX_FAVORITES — au-delà, le plus ancien sort).
 */
export function toggleFavorite(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  trip: SavedTrip,
): SavedTrip[] {
  const current = loadFavorites(storage);
  const without = current.filter((t) => tripKey(t) !== tripKey(trip));
  const next =
    without.length === current.length ? [trip, ...current].slice(0, MAX_FAVORITES) : without;
  saveList(storage, FAVORITES_KEY, next);
  return next;
}
