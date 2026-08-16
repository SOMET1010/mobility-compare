import { env } from '@/config/env';

/**
 * Client du calcul d'itinéraire — parle à l'Edge Function `itineraire`,
 * seul chemin vers notre serveur de routage (DEP-001, levée le 16/08/2026).
 * Le jeton du serveur vit côté fonction et ne transite jamais ici. En cas
 * d'indisponibilité : réponse nulle, l'appelant garde la matrice routière
 * précalculée (invariant I1 — repli honnête, jamais de valeur inventée).
 */

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface RoadRoute {
  /** Distance routière en kilomètres, arrondie à 0,1 km. */
  readonly km: number;
  /** Durée voiture sans trafic (secondes) — indicative, non affichée telle quelle. */
  readonly durationS: number;
}

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/itineraire` : null;
}

/**
 * Mémoire de session : une paire déjà calculée ne repart pas au serveur.
 * Seuls les succès sont mémorisés — un serveur momentanément injoignable
 * doit pouvoir répondre à l'essai suivant.
 */
const cache = new Map<string, RoadRoute>();

/** Distance et durée routières réelles entre deux points, ou null (repli). */
export async function fetchRoadRoute(depart: LatLng, arrivee: LatLng): Promise<RoadRoute | null> {
  const url = functionUrl();
  if (!url) return null;
  const key = `${depart.lat},${depart.lng}__${arrivee.lat},${arrivee.lng}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ depart, arrivee }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      disponible?: boolean;
      distance_m?: number;
      duree_s?: number;
    } | null;
    if (
      !json?.disponible ||
      typeof json.distance_m !== 'number' ||
      typeof json.duree_s !== 'number' ||
      !Number.isFinite(json.distance_m) ||
      json.distance_m <= 0
    ) {
      return null;
    }
    const route: RoadRoute = {
      km: Math.round(json.distance_m / 100) / 10,
      durationS: json.duree_s,
    };
    cache.set(key, route);
    return route;
  } catch {
    return null;
  }
}
