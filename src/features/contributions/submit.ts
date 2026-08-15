import { getSupabase } from '@/modules/backend/client';

/**
 * Dépôt d'une observation de prix (CDC M4).
 *
 * Trois issues possibles, jamais confondues (doctrine « prouvé, pas déclaré ») :
 * - SAVED     : la ligne est réellement en file de modération (backend actif) ;
 * - SIMULATED : pas de backend configuré — rien n'a été enregistré, et
 *               l'appelant doit le dire à l'usager ;
 * - ERROR     : le backend a refusé — l'échec est montré, pas maquillé.
 */

export interface ContributionInput {
  readonly fromCommune: string;
  readonly toCommune: string;
  readonly mode: 'VTC' | 'TAXI' | 'WORO' | 'GBAKA';
  readonly priceXof: number;
  readonly rushHour: boolean | null;
}

export type ContributionResult =
  | { readonly outcome: 'SAVED' }
  | { readonly outcome: 'SIMULATED' }
  | { readonly outcome: 'ERROR'; readonly message: string };

export async function submitContribution(input: ContributionInput): Promise<ContributionResult> {
  const supabase = await getSupabase();
  if (!supabase) return { outcome: 'SIMULATED' };

  const { error } = await supabase.from('fare_observations').insert({
    from_commune: input.fromCommune,
    to_commune: input.toCommune,
    mode: input.mode,
    price_xof: input.priceXof,
    rush_hour: input.rushHour,
    source: 'app',
  });

  if (error) return { outcome: 'ERROR', message: error.message };
  return { outcome: 'SAVED' };
}
