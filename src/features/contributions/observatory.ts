import type { DemoMode } from '@/demo/scenario';
import { getSupabase } from '@/modules/backend/client';
import {
  aggregateByMode,
  type ObservationRow,
  type ObservedAggregate,
} from '@/features/contributions/aggregate';

/**
 * Observatoire des prix (CDC M10, version pilote).
 * Ne montre QUE des observations approuvées (RLS), regroupées par corridor
 * et par mode — jamais une valeur simulée, jamais un agrégat sous le seuil.
 */

export interface CorridorRow extends ObservationRow {
  readonly from_commune: string;
  readonly to_commune: string;
}

export interface CorridorStats {
  readonly fromId: string;
  readonly toId: string;
  /** Relevés approuvés sur ce corridor, tous modes confondus. */
  readonly total: number;
  /** Date ISO du relevé le plus récent du corridor. */
  readonly latestAt: string | null;
  readonly byMode: Partial<Record<DemoMode, ObservedAggregate>>;
}

/** Regroupe par corridor (sens conservé), tri par volume décroissant. */
export function groupByCorridor(rows: readonly CorridorRow[]): CorridorStats[] {
  const byPair = new Map<string, CorridorRow[]>();
  for (const row of rows) {
    const key = `${row.from_commune}→${row.to_commune}`;
    const list = byPair.get(key) ?? [];
    list.push(row);
    byPair.set(key, list);
  }
  const out: CorridorStats[] = [];
  for (const list of byPair.values()) {
    const first = list[0]!;
    out.push({
      fromId: first.from_commune,
      toId: first.to_commune,
      total: list.length,
      latestAt: list.reduce<string | null>(
        (acc, r) => (acc === null || r.observed_at > acc ? r.observed_at : acc),
        null,
      ),
      byMode: aggregateByMode(list),
    });
  }
  return out.sort(
    (a, b) => b.total - a.total || `${a.fromId}${a.toId}`.localeCompare(`${b.fromId}${b.toId}`),
  );
}

export interface ObservatoryData {
  readonly corridors: CorridorStats[];
  readonly total: number;
  readonly latestAt: string | null;
}

/** `null` = backend absent ou injoignable — la page l'affiche honnêtement. */
export async function fetchObservatory(): Promise<ObservatoryData | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('fare_observations')
      .select('from_commune, to_commune, mode, price_xof, observed_at')
      .eq('status', 'APPROVED')
      .order('observed_at', { ascending: false })
      .limit(2000);
    if (error || !data) return null;
    const rows = data as CorridorRow[];
    const corridors = groupByCorridor(rows);
    return {
      corridors,
      total: rows.length,
      latestAt: rows.reduce<string | null>(
        (acc, r) => (acc === null || r.observed_at > acc ? r.observed_at : acc),
        null,
      ),
    };
  } catch {
    return null;
  }
}
