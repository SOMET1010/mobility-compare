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
