import { env } from '@/config/env';

/**
 * Client des lignes de transport cartographiées — parle à l'Edge Function
 * `lignes` : quelles lignes (gbaka, woro-woro, bus, bateau-bus) passent
 * près du départ ET de l'arrivée ? Source : OpenStreetMap, servie par
 * notre infrastructure. Pas d'horaires ni de tarifs dans la source — on
 * n'affiche donc que l'existence des lignes. Indisponible → null,
 * la section n'apparaît pas (absence honnête).
 */

export interface LigneProche {
  readonly nom: string;
  readonly mode: string;
  readonly ref: string;
  /** Marche du départ au point de ligne le plus proche (mètres). */
  readonly montee_m?: number;
  /** Marche du point de ligne le plus proche à l'arrivée (mètres). */
  readonly descente_m?: number;
}

/** ~300 m / ~1,2 km — arrondi au pas de 50 m, jamais faussement précis. */
export function fmtWalk(m: number | undefined): string | null {
  if (typeof m !== 'number' || !Number.isFinite(m) || m < 0) return null;
  const arrondi = Math.max(50, Math.round(m / 50) * 50);
  if (arrondi >= 1000) return `~${(arrondi / 1000).toFixed(1).replace('.', ',')} km`;
  return `~${arrondi} m`;
}

/** « gbaka : Adjamé → Lokoa » → « Adjamé → Lokoa » (le mode a sa pastille). */
export function cleanLineName(nom: string): string {
  return nom
    .replace(/^(gbaka|w[oô]r[oô][ -]?w[oô]r[oô](\s+\S+)?|bus\s*\S*|navette\s*\S*)\s*:\s*/i, '')
    .trim();
}

/** Trajet à une correspondance : ligne 1, changement, ligne 2. */
export interface Correspondance {
  readonly ligne1: string;
  readonly mode1: string;
  readonly ref1: string;
  readonly montee_m: number;
  readonly ligne2: string;
  readonly mode2: string;
  readonly ref2: string;
  readonly descente_m: number;
  readonly correspondance_m: number;
  /** Nom du lieu connu le plus proche du point de changement (ou null). */
  readonly gare?: string | null;
}

/** Lignes directes + trajets à une correspondance, pour une paire de points. */
export interface TransitInfo {
  readonly lignes: LigneProche[];
  readonly correspondances: Correspondance[];
}

/** Clé d'étape insensible au sens (« A → B » ≡ « B → A »). */
function legKey(nom: string, mode: string, ref: string): string {
  const bouts = cleanLineName(nom)
    .toLowerCase()
    .split('→')
    .map((b) => b.trim())
    .sort()
    .join('|');
  return `${mode}|${ref}|${bouts}`;
}

/** Fusionne les variantes aller/retour des trajets à correspondance. */
export function dedupeCorrespondances(liste: readonly Correspondance[]): Correspondance[] {
  const vus = new Set<string>();
  const uniques: Correspondance[] = [];
  for (const c of liste) {
    const cle = `${legKey(c.ligne1, c.mode1, c.ref1)}||${legKey(c.ligne2, c.mode2, c.ref2)}`;
    if (!vus.has(cle)) {
      vus.add(cle);
      uniques.push(c);
    }
  }
  return uniques;
}

/**
 * Fusionne les allers-retours (« A → B » et « B → A » = une seule ligne)
 * et les doublons exacts. Ordre d'arrivée préservé.
 */
export function dedupeLines(lignes: readonly LigneProche[]): LigneProche[] {
  const vus = new Set<string>();
  const uniques: LigneProche[] = [];
  for (const l of lignes) {
    const bouts = cleanLineName(l.nom)
      .toLowerCase()
      .split('→')
      .map((b) => b.trim())
      .sort()
      .join('|');
    const cle = `${l.mode}|${l.ref}|${bouts}`;
    if (!vus.has(cle)) {
      vus.add(cle);
      uniques.push(l);
    }
  }
  return uniques;
}

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/lignes` : null;
}

/** Mémoire de session par paire ; seuls les succès sont mémorisés. */
const cache = new Map<string, TransitInfo>();

export async function fetchLignes(
  depart: { lat: number; lng: number },
  arrivee: { lat: number; lng: number },
): Promise<TransitInfo | null> {
  const url = functionUrl();
  if (!url) return null;
  const cle = `${depart.lat},${depart.lng}__${arrivee.lat},${arrivee.lng}`;
  const connu = cache.get(cle);
  if (connu) return connu;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ depart, arrivee }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      disponible?: boolean;
      lignes?: LigneProche[];
      correspondances?: Correspondance[];
    } | null;
    if (!json?.disponible || !Array.isArray(json.lignes)) return null;
    const info: TransitInfo = {
      lignes: dedupeLines(
        json.lignes.filter((l) => typeof l?.nom === 'string' && typeof l?.mode === 'string'),
      ),
      correspondances: dedupeCorrespondances(
        (Array.isArray(json.correspondances) ? json.correspondances : []).filter(
          (c) => typeof c?.ligne1 === 'string' && typeof c?.ligne2 === 'string',
        ),
      ),
    };
    cache.set(cle, info);
    return info;
  } catch {
    return null;
  }
}
