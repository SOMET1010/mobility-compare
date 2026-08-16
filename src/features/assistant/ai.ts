import { env } from '@/config/env';

/**
 * Client de l'assistant IA — parle à l'Edge Function `assistant`.
 * La clé du fournisseur d'IA vit côté serveur (secret de fonction) et ne
 * transite jamais ici. Le serveur porte la charte : pas de prix inventés,
 * neutralité, pas de données personnelles.
 */

export interface AiTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export type AiResult =
  | { readonly ok: true; readonly reply: string }
  | { readonly ok: false; readonly error: string; readonly unavailable?: boolean };

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/assistant` : null;
}

/** L'IA est-elle joignable en principe (backend configuré) ? */
export function isAiConfigured(): boolean {
  return functionUrl() !== null;
}

/** Pose la question (avec l'historique récent) à l'IA serveur. */
export async function askAi(history: readonly AiTurn[]): Promise<AiResult> {
  const url = functionUrl();
  if (!url) return { ok: false, error: 'Backend non configuré.', unavailable: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-8) }),
    });
    const json = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
    if (res.ok && typeof json.reply === 'string' && json.reply.length > 0) {
      return { ok: true, reply: json.reply };
    }
    return {
      ok: false,
      error: json.error ?? `Erreur ${res.status}`,
      // 503 = clé absente côté serveur : inutile de réessayer cette session.
      unavailable: res.status === 503,
    };
  } catch {
    return { ok: false, error: 'Réseau indisponible.' };
  }
}
