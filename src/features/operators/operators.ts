import type { DemoMode } from '@/demo/scenario';
import { getSupabase } from '@/modules/backend/client';

/**
 * Opérateurs et statut d'agrément — invariant I4.
 * Le code ne connaît AUCUN nom d'opérateur : tout vient de la table
 * `operators`, où chaque statut est daté et sourcé, et où seuls les
 * opérateurs explicitement publiés sont visibles (RLS). InDrive, non agréé,
 * reste INTERNAL_ONLY (CDC §4) : la base ne le sert pas au navigateur.
 */

export interface Operator {
  readonly id: string;
  readonly label: string;
  readonly mode: DemoMode;
  readonly agrement_status: 'AGREE' | 'NON_AGREE' | 'INCONNU';
  readonly status_verified_at: string | null;
  readonly status_source: string | null;
  readonly brand_color: string | null;
}

export const AGREMENT_LABEL: Record<Operator['agrement_status'], string> = {
  AGREE: 'Plateforme agréée',
  NON_AGREE: 'Non agréée',
  INCONNU: 'Statut non vérifié',
};

/** Opérateurs publiés, par mode. `null` = backend absent : rien n'est affiché. */
export async function fetchPublishedOperators(): Promise<Operator[] | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('operators')
      .select('id, label, mode, agrement_status, status_verified_at, status_source, brand_color')
      .order('label');
    if (error || !data) return null;
    return data as Operator[];
  } catch {
    return null;
  }
}
