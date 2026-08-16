import { env } from '@/config/env';

/**
 * Lecture du compteur d'audience — réservée à l'écran protégé /moderation.
 * La requête porte le jeton de modérateur ; les données ne contiennent que
 * des nombres par jour et par page (aucune donnée personnelle n'existe).
 */

export interface AudienceDay {
  readonly jour: string;
  readonly page: string;
  readonly vues: number;
  readonly visites: number;
}

export type AudienceResult =
  | { readonly ok: true; readonly jours: readonly AudienceDay[] }
  | { readonly ok: false; readonly error: string };

/** Les 30 derniers jours de compteurs, du plus récent au plus ancien. */
export async function getAudience(token: string): Promise<AudienceResult> {
  if (!env.VITE_SUPABASE_URL) return { ok: false, error: 'Backend non configuré.' };
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/audience`, {
      headers: { 'x-moderation-token': token },
    });
    const json = (await res.json().catch(() => ({}))) as {
      jours?: AudienceDay[];
      error?: string;
    };
    if (!res.ok || !Array.isArray(json.jours)) {
      return { ok: false, error: json.error ?? `Erreur ${res.status}` };
    }
    return { ok: true, jours: json.jours };
  } catch {
    return { ok: false, error: 'Réseau indisponible.' };
  }
}
