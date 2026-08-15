import { getSupabase } from '@/modules/backend/client';

/**
 * Compteurs d'observations APPROUVÉES (les seules lisibles par la clé
 * navigateur — politique RLS). `null` = backend absent ou injoignable :
 * l'UI n'affiche alors rien, jamais un zéro déguisé en mesure.
 */
export interface ObservationCounts {
  /** Toutes communes confondues. */
  readonly total: number;
  /** Sur le trajet affiché (dans ce sens). */
  readonly pair: number;
}

export async function fetchApprovedCounts(
  fromId: string,
  toId: string,
): Promise<ObservationCounts | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const [totalRes, pairRes] = await Promise.all([
      supabase
        .from('fare_observations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'APPROVED'),
      supabase
        .from('fare_observations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'APPROVED')
        .eq('from_commune', fromId)
        .eq('to_commune', toId),
    ]);
    if (totalRes.error || pairRes.error) return null;
    return { total: totalRes.count ?? 0, pair: pairRes.count ?? 0 };
  } catch {
    return null;
  }
}
