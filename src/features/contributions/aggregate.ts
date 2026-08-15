import type { DemoMode } from '@/demo/scenario';
import { getSupabase } from '@/modules/backend/client';

/**
 * Agrégat des prix OBSERVÉS par corridor et par mode.
 *
 * Règle d'honnêteté : une médiane n'est affichée qu'à partir de
 * MEDIAN_MIN_OBSERVATIONS relevés approuvés — en dessous, on montre le
 * compte, jamais une « tendance » calculée sur deux tickets. Le seuil est
 * une borne technique provisoire (comme le plafond de majoration ×3) :
 * aucune règle statistique officielle n'a été arbitrée, et il est assumé
 * comme tel.
 */
export const MEDIAN_MIN_OBSERVATIONS = 5;

export interface ObservedAggregate {
  readonly count: number;
  /** Médiane en FCFA — `null` tant que le seuil n'est pas atteint. */
  readonly medianXof: number | null;
  /** Date ISO du relevé le plus récent (fraîcheur, invariant I2). */
  readonly latestAt: string | null;
}

export interface ObservationRow {
  readonly mode: DemoMode;
  readonly price_xof: number;
  readonly observed_at: string;
}

/** Médiane classique ; `null` sur une liste vide. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** Agrège des lignes approuvées par mode, seuil de médiane appliqué. */
export function aggregateByMode(
  rows: readonly ObservationRow[],
): Partial<Record<DemoMode, ObservedAggregate>> {
  const byMode = new Map<DemoMode, ObservationRow[]>();
  for (const row of rows) {
    const list = byMode.get(row.mode) ?? [];
    list.push(row);
    byMode.set(row.mode, list);
  }
  const out: Partial<Record<DemoMode, ObservedAggregate>> = {};
  for (const [mode, list] of byMode) {
    const latest = list.reduce<string | null>(
      (acc, r) => (acc === null || r.observed_at > acc ? r.observed_at : acc),
      null,
    );
    out[mode] = {
      count: list.length,
      medianXof:
        list.length >= MEDIAN_MIN_OBSERVATIONS ? median(list.map((r) => r.price_xof)) : null,
      latestAt: latest,
    };
  }
  return out;
}

/**
 * Observations approuvées du trajet (RLS : seules les approuvées sont
 * lisibles), agrégées par mode. `null` = backend absent ou injoignable.
 */
export async function fetchPairAggregates(
  fromId: string,
  toId: string,
): Promise<Partial<Record<DemoMode, ObservedAggregate>> | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('fare_observations')
      .select('mode, price_xof, observed_at')
      .eq('status', 'APPROVED')
      .eq('from_commune', fromId)
      .eq('to_commune', toId)
      .order('observed_at', { ascending: false })
      .limit(500);
    if (error || !data) return null;
    return aggregateByMode(data as ObservationRow[]);
  } catch {
    return null;
  }
}
