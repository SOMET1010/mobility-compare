import { COMMUNES } from '@/demo/scenario';

/**
 * Recherche de lieu « en tapant » — le geste n° 1 du produit.
 * Insensible aux accents, apostrophes et tirets (« adjame » trouve Adjamé,
 * « anono » trouve Anono). Classement : début du nom, puis début d'un mot
 * du nom, puis contenu, puis commune de rattachement.
 */

export interface PlaceHit {
  readonly id: string;
  readonly name: string;
  readonly commune: string;
}

/** Forme canonique pour la comparaison : minuscules, sans accents ni ponctuation. */
function strip(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identifiants de POINT LIBRE (adresse trouvée par notre géocodeur) :
 * `g~lat~lng~label` — sérialisables dans l'URL comme les identifiants de
 * quartier, donc partage et lien profond fonctionnent à l'identique.
 */
const PREFIXE_ADRESSE = 'g~';

export interface ResolvedPoint {
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  /** Identifiant de quartier connu, ou null pour une adresse libre. */
  readonly placeId: string | null;
}

/** Fabrique l'identifiant d'un point libre (adresse). */
export function makeAddressId(lat: number, lng: number, label: string): string {
  return `${PREFIXE_ADRESSE}${lat.toFixed(5)}~${lng.toFixed(5)}~${encodeURIComponent(label)}`;
}

/** Un identifiant est-il un point libre (adresse) ? */
export function isAddressId(id: string): boolean {
  return id.startsWith(PREFIXE_ADRESSE);
}

/**
 * Résout un identifiant — quartier connu ou adresse `g~…` — vers un point
 * nommé. Null si inconnu ou malformé (jamais d'à-peu-près).
 */
export function resolvePoint(id: string): ResolvedPoint | null {
  const lieu = COMMUNES.find((c) => c.id === id);
  if (lieu) return { name: lieu.name, lat: lieu.lat, lng: lieu.lng, placeId: lieu.id };
  if (!isAddressId(id)) return null;
  const parts = id.slice(PREFIXE_ADRESSE.length).split('~');
  if (parts.length < 3) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  let name: string;
  try {
    name = decodeURIComponent(parts.slice(2).join('~'));
  } catch {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name.trim()) return null;
  // Bornes Côte d'Ivoire : un lien forgé hors périmètre est rejeté.
  if (lat < 4.2 || lat > 10.9 || lng < -8.7 || lng > -2.3) return null;
  return { name: name.trim(), lat, lng, placeId: null };
}

/** Repli local : vol d'oiseau × facteur route (estimation, arrondie à 0,1 km). */
export function roadEstimateKm(a: ResolvedPoint, b: ResolvedPoint): number {
  return Math.max(0.5, Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * 1.35 * 10) / 10);
}

const R_TERRE_KM = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Lieu connu le plus proche d'une position — calcul ENTIÈREMENT local :
 * la position ne quitte jamais l'appareil (aucun envoi réseau ici).
 * Null si l'on est manifestement hors d'Abidjan (> 35 km du plus proche).
 */
export function nearestPlace(lat: number, lng: number): PlaceHit | null {
  let best: { hit: PlaceHit; d: number } | null = null;
  for (const c of COMMUNES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || d < best.d) {
      best = { hit: { id: c.id, name: c.name, commune: c.commune }, d };
    }
  }
  return best && best.d <= 35 ? best.hit : null;
}

/** Lieux correspondant à la saisie, du plus pertinent au moins pertinent. */
export function searchPlaces(query: string, limit = 8): PlaceHit[] {
  const q = strip(query);
  if (!q) return [];
  const scored: { hit: PlaceHit; score: number }[] = [];
  for (const c of COMMUNES) {
    const name = strip(c.name);
    const commune = strip(c.commune);
    let score: number | null = null;
    if (name.startsWith(q)) score = 0;
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (commune.startsWith(q) || commune.split(' ').some((w) => w.startsWith(q))) score = 3;
    if (score !== null) scored.push({ hit: { id: c.id, name: c.name, commune: c.commune }, score });
  }
  scored.sort((a, b) => a.score - b.score || a.hit.name.localeCompare(b.hit.name, 'fr'));
  return scored.slice(0, limit).map((s) => s.hit);
}
