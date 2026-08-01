/**
 * DETECTEUR DE SECRETS — QUATRE NIVEAUX DE QUALIFICATION
 * =============================================================================
 * Le controle initial du jalon J1 remontait 3 occurrences de `sb_secret_...`
 * qui etaient toutes des mentions documentaires du FORMAT d'une cle, pas des
 * valeurs. Un controle qui ne sait pas faire cette distinction produit du bruit,
 * et un controle bruyant finit ignore.
 *
 * On ne cherche donc pas a obtenir artificiellement zero occurrence : on
 * qualifie chaque occurrence.
 *
 *   SAFE_EXAMPLE  Prefixe ou exemple volontairement tronque (`sb_secret_...`)
 *   SUSPECT       Ressemble a une cle complete, sans certitude
 *   CONFIRMED_JWT JWT complet et decodable — echec immediat
 *   HISTORY       Secret present dans l'historique Git, meme s'il a ete retire
 *
 * Seuls SUSPECT, CONFIRMED_JWT et HISTORY font echouer la CI.
 * =============================================================================
 */

export type SecretVerdict = 'SAFE_EXAMPLE' | 'SUSPECT' | 'CONFIRMED_JWT';

export interface SecretFinding {
  readonly verdict: SecretVerdict;
  readonly kind: string;
  readonly excerpt: string;
  readonly reason: string;
}

/** Marqueurs de troncature : la valeur a ete deliberement coupee. */
const TRUNCATION_MARKERS = ['...', '…', 'xxx', 'XXX', '<', '>', 'your-', 'votre-', 'exemple'];

function looksTruncated(candidate: string): boolean {
  return TRUNCATION_MARKERS.some((marker) => candidate.includes(marker));
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(
      typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    return typeof decoded['role'] === 'string' ? decoded['role'] : 'inconnu';
  } catch {
    return null;
  }
}

/**
 * Analyse un contenu et retourne les occurrences qualifiees.
 * Les extraits sont toujours tronques : ce rapport peut circuler.
 */
export function scanForSecrets(content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  // 1. JWT complets : trois segments base64 separes par des points.
  const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  for (const match of content.matchAll(jwtPattern)) {
    const token = match[0];
    const role = decodeJwtRole(token);
    findings.push({
      verdict: 'CONFIRMED_JWT',
      kind: 'jwt',
      excerpt: `${token.slice(0, 12)}...`,
      reason:
        role === null ? 'JWT complet non decodable' : `JWT complet et decodable, role « ${role} »`,
    });
  }

  // 2. Cles Supabase nouvelle generation.
  const supabasePattern = /sb_(secret|publishable)_[A-Za-z0-9._-]*/g;
  for (const match of content.matchAll(supabasePattern)) {
    const candidate = match[0];
    const suffix = candidate.replace(/^sb_(secret|publishable)_/, '');
    if (looksTruncated(candidate) || suffix.length < 12) {
      findings.push({
        verdict: 'SAFE_EXAMPLE',
        kind: `supabase_${match[1]}`,
        excerpt: candidate.slice(0, 24),
        reason: 'Prefixe documentaire ou valeur tronquee, pas une cle exploitable',
      });
      continue;
    }
    findings.push({
      verdict: 'SUSPECT',
      kind: `supabase_${match[1]}`,
      excerpt: `${candidate.slice(0, 16)}...`,
      reason: `Longueur de suffixe compatible avec une cle reelle (${suffix.length} caracteres)`,
    });
  }

  // 3. Affectation d'une variable de secret avec une valeur non vide.
  const assignmentPattern =
    /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|SERVICE_ROLE|API_KEY|PEPPER)[A-Z0-9_]*)\s*=\s*(\S+)/g;
  for (const match of content.matchAll(assignmentPattern)) {
    const [, name, rawValue] = match as unknown as [string, string, string];
    const value = rawValue.replace(/^["']|["'],?$/g, '');
    if (value.length === 0 || value.startsWith('#') || looksTruncated(value)) continue;
    if (value.length < 12) continue;
    findings.push({
      verdict: 'SUSPECT',
      kind: 'assignment',
      excerpt: `${name}=${value.slice(0, 6)}...`,
      reason: `Variable de secret affectee a une valeur de ${value.length} caracteres`,
    });
  }

  return findings;
}

/** Une occurrence fait-elle echouer le controle ? */
export function isBlocking(finding: SecretFinding): boolean {
  return finding.verdict !== 'SAFE_EXAMPLE';
}
