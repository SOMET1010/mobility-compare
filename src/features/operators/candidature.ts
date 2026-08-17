import { env } from '@/config/env';
import type { DemoMode } from '@/demo/scenario';

/**
 * Candidature d'un opérateur pour figurer sur le comparateur — parle à
 * l'Edge Function `candidature`, qui range la demande en file d'examen
 * (table service-role uniquement). Rien n'est publié automatiquement :
 * chaque statut d'agrément est vérifié, daté et sourcé avant publication
 * (invariant I4). Être listé est gratuit ; l'ordre ne s'achète pas.
 */

export interface CandidatureOperateur {
  readonly nom: string;
  readonly mode: DemoMode;
  readonly contact: string;
  readonly referenceAgrement?: string;
  readonly message?: string;
}

export type CandidatureResult =
  { outcome: 'SAVED' } | { outcome: 'SIMULATED' } | { outcome: 'ERROR'; message: string };

/** Vérification locale avant envoi — message d'erreur en clair, ou null. */
export function validateCandidature(c: CandidatureOperateur): string | null {
  const nom = c.nom.trim();
  const contact = c.contact.trim();
  if (nom.length < 2) return 'Indiquez le nom de l’opérateur.';
  if (nom.length > 120) return 'Nom trop long (120 caractères maximum).';
  if (contact.length < 5) return 'Indiquez un contact joignable (e-mail ou téléphone).';
  if (contact.length > 200) return 'Contact trop long (200 caractères maximum).';
  if ((c.referenceAgrement ?? '').length > 200) return 'Référence d’agrément trop longue.';
  if ((c.message ?? '').length > 2000) return 'Message trop long (2 000 caractères maximum).';
  return null;
}

export async function submitCandidature(c: CandidatureOperateur): Promise<CandidatureResult> {
  const invalide = validateCandidature(c);
  if (invalide) return { outcome: 'ERROR', message: invalide };
  if (!env.VITE_SUPABASE_URL) return { outcome: 'SIMULATED' };
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/candidature`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nom: c.nom.trim(),
        mode: c.mode,
        contact: c.contact.trim(),
        reference_agrement: c.referenceAgrement?.trim() || undefined,
        message: c.message?.trim() || undefined,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => null)) as { enregistree?: boolean } | null;
    if (res.ok && json?.enregistree) return { outcome: 'SAVED' };
    return {
      outcome: 'ERROR',
      message: 'Envoi impossible pour le moment — réessayez dans un instant.',
    };
  } catch {
    return {
      outcome: 'ERROR',
      message: 'Envoi impossible pour le moment — réessayez dans un instant.',
    };
  }
}
