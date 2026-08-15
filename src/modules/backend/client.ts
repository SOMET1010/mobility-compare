import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/env';

/**
 * Client Supabase — instancié uniquement si la configuration publique est
 * complète (URL + clé publishable), sinon `null` : l'application fonctionne
 * alors en mode simulation locale, sans demi-état (même règle que
 * IS_BACKEND_CONFIGURED).
 *
 * IMPORT DYNAMIQUE : la librairie (~65 Ko gzip) ne rejoint jamais le bundle
 * initial (contrainte CDC < 1 Mo sur 3G) — elle ne se charge qu'au premier
 * usage réel, et seulement si le backend est configuré.
 *
 * La clé publishable est soumise aux politiques RLS : côté navigateur, elle ne
 * peut que déposer une observation en attente de modération et lire les
 * observations approuvées (voir supabase/migrations/).
 */
let cached: SupabaseClient | null | undefined;

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return cached;
  const config = getSupabaseConfig();
  if (!config) {
    cached = null;
    return cached;
  }
  const { createClient } = await import('@supabase/supabase-js');
  cached = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Réservé aux tests : réinitialise le cache d'instance. */
export function resetSupabaseForTests(): void {
  cached = undefined;
}
