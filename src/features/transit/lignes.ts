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
}

/** « gbaka : Adjamé → Lokoa » → « Adjamé → Lokoa » (le mode a sa pastille). */
export function cleanLineName(nom: string): string {
  return nom
    .replace(/^(gbaka|w[oô]r[oô][ -]?w[oô]r[oô]|bus\s*\S*|navette\s*\S*)\s*:\s*/i, '')
    .trim();
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
const cache = new Map<string, LigneProche[]>();

export async function fetchLignes(
  depart: { lat: number; lng: number },
  arrivee: { lat: number; lng: number },
): Promise<LigneProche[] | null> {
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
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      disponible?: boolean;
      lignes?: LigneProche[];
    } | null;
    if (!json?.disponible || !Array.isArray(json.lignes)) return null;
    const lignes = dedupeLines(
      json.lignes.filter((l) => typeof l?.nom === 'string' && typeof l?.mode === 'string'),
    );
    cache.set(cle, lignes);
    return lignes;
  } catch {
    return null;
  }
}
