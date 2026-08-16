import { env } from '@/config/env';

/**
 * Administration de l'assistant IA — réservée à l'écran protégé /moderation.
 * Toutes les requêtes portent le jeton de modérateur ; la clé du fournisseur
 * ne revient JAMAIS ici : le serveur ne renvoie qu'une empreinte masquée.
 */

export interface AiConfigStatus {
  readonly configured: boolean;
  readonly source?: 'secret' | 'base';
  readonly model?: string;
  readonly base_url?: string;
  readonly key_hint?: string;
  readonly updated_at?: string | null;
}

export type AdminResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/assistant` : null;
}

async function call<T>(token: string, body: object): Promise<AdminResult<T>> {
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
    return { ok: false, error: 'Réseau indisponible.' };
  }
}

/** État courant (clé masquée, modèle, source secret/base). */
export function getAiConfig(token: string): Promise<AdminResult<AiConfigStatus>> {
  return call<AiConfigStatus>(token, { action: 'get_config' });
}

/** Enregistre la configuration. Clé vide = conserver la clé existante. */
export function setAiConfig(
  token: string,
  cfg: { api_key?: string; model?: string; base_url?: string },
): Promise<AdminResult<{ saved: boolean; warning?: string }>> {
  return call(token, { action: 'set_config', ...cfg });
}

/**
 * Appel minimal au modèle pour valider clé + modèle + adresse. Si la clé
 * appartient à l'autre plateforme Moonshot, le serveur corrige l'adresse
 * tout seul et le signale via `switched_base_url`.
 */
export function testAi(
  token: string,
): Promise<
  AdminResult<{ ok: boolean; model?: string; error?: string; switched_base_url?: string }>
> {
  return call(token, { action: 'test' });
}
