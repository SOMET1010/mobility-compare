import { env } from '@/config/env';
import type { DemoMode } from '@/demo/scenario';

/**
 * Client de l'écran de modération — parle à l'Edge Function `moderation`.
 * L'authentification est un jeton de modérateur (en-tête dédié), comparé par
 * empreinte côté serveur ; la clé serveur ne quitte jamais la fonction.
 * Le jeton n'est jamais persisté au-delà de la session du navigateur.
 */

export interface PendingObservation {
  readonly id: string;
  readonly observed_at: string;
  readonly from_commune: string;
  readonly to_commune: string;
  readonly mode: DemoMode;
  readonly price_xof: number;
  readonly rush_hour: boolean | null;
  readonly wait_min: number | null;
  readonly comment: string | null;
  readonly source: 'app' | 'import';
  readonly created_at: string;
}

export type ModerationResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/moderation` : null;
}

async function call<T>(token: string, body: object): Promise<ModerationResult<T>> {
  const url = functionUrl();
  if (!url) return { ok: false, error: 'Backend non configuré sur ce déploiement.' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-moderation-token': token },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) return { ok: false, error: json.error ?? `Erreur ${res.status}` };
    return { ok: true, value: json };
  } catch {
    return { ok: false, error: 'Réseau injoignable.' };
  }
}

export async function listPending(
  token: string,
): Promise<ModerationResult<{ pending: PendingObservation[] }>> {
  return call(token, { action: 'list' });
}

export async function decide(
  token: string,
  id: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<ModerationResult<{ decided: { id: string; status: string } }>> {
  return call(token, { action: 'decide', id, decision });
}

/** Candidature d'opérateur en file d'examen (table operator_applications). */
export interface OperatorApplication {
  readonly id: string;
  readonly created_at: string;
  readonly nom: string;
  readonly mode: DemoMode;
  readonly contact: string;
  readonly reference_agrement: string | null;
  readonly message: string | null;
  readonly api_devis_url: string | null;
  readonly contact_technique: string | null;
  readonly statut: 'RECUE' | 'EN_EXAMEN' | 'ACCEPTEE' | 'REFUSEE';
}

export type CandidatureStatut = 'EN_EXAMEN' | 'ACCEPTEE' | 'REFUSEE';

export async function listCandidatures(
  token: string,
): Promise<ModerationResult<{ candidatures: OperatorApplication[] }>> {
  return call(token, { action: 'candidatures' });
}

/**
 * Change le statut d'une candidature. Accepter ne publie RIEN : la
 * publication dans la table operators reste un geste séparé, avec statut
 * d'agrément vérifié, daté et sourcé (invariant I4).
 */
export async function decideCandidature(
  token: string,
  id: string,
  statut: CandidatureStatut,
): Promise<ModerationResult<{ decided: { id: string; statut: string } }>> {
  return call(token, { action: 'candidature_decide', id, statut });
}

/**
 * Borne de vraisemblance indicative par mode (aide visuelle du modérateur,
 * jamais une décision automatique — CDC M4, détection d'aberrations).
 */
export const PLAUSIBLE_XOF: Record<DemoMode, readonly [number, number]> = {
  VTC: [800, 15000],
  TAXI: [500, 12000],
  WORO: [150, 1500],
  GBAKA: [100, 1000],
  MOTO: [500, 8000],
  TRICYCLE: [1000, 15000],
  CARGO: [1500, 20000],
};

export function isOutlier(mode: DemoMode, priceXof: number): boolean {
  const [min, max] = PLAUSIBLE_XOF[mode];
  return priceXof < min || priceXof > max;
}
