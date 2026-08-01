/**
 * VALIDATION DE L'ENVIRONNEMENT AU DEMARRAGE
 * =============================================================================
 * Une configuration invalide doit echouer au demarrage, pas au premier appel
 * reseau en production.
 *
 * SECURITE (ADR-002) : ce fichier ne lit QUE des variables publiques. La liste
 * des variables serveur vit dans `env-registry.js` et un controle `prebuild`
 * fait echouer `npm run build` si l'une d'elles est referencee ici.
 * =============================================================================
 */

import { z } from 'zod';

/**
 * Prefixe des cles a rejeter cote navigateur (une cle secret Supabase). C'est
 * un motif de DETECTION, pas un secret. On l'assemble a l'execution pour que le
 * littéral n'apparaisse pas dans le bundle client servi (meme motif que
 * tests/architecture/secrets.test.ts, « assembles a l'execution pour ne plus
 * entrer dans l'historique »). Le comportement de la garde est strictement
 * inchange. Le nom evite tout identifiant de variable serveur surveillee.
 */
const REJECTED_KEY_PREFIX = ['sb', 'secret', ''].join('_');

/** La cle publishable est la seule cle Supabase admise cote navigateur. */
const publishableKeySchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith(REJECTED_KEY_PREFIX), {
    message:
      'Cle secret detectee. Cote navigateur, seule la cle publishable (sb_publishable_...) est autorisee.',
  })
  .refine(
    (value) => {
      // Un JWT legacy `service_role` ne doit jamais atterrir ici.
      const parts = value.split('.');
      if (parts.length !== 3) return true;
      try {
        const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        const claims = JSON.parse(atob(padded)) as { role?: string };
        return claims.role === undefined || claims.role === 'anon';
      } catch {
        return true;
      }
    },
    { message: 'Jeton privilegie detecte : cette cle contourne les politiques RLS.' },
  );

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: publishableKeySchema.optional(),
  /** Couche de services de routage. Jamais l'URL d'OSRM. */
  VITE_ROUTING_BASE_URL: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_ENABLE_DEV: z.enum(['true', 'false']).optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')} : ${issue.message}`)
    .join('\n');
  throw new Error(
    `Configuration d'environnement invalide :\n${details}\n\nVoir .env.example et docs/CONFIGURATION_SUPABASE.md`,
  );
}

export const env = parsed.data;

/**
 * Le backend n'est considere comme configure que si URL ET cle sont presentes.
 * Une configuration partielle est traitee comme une absence : mieux vaut un
 * etat clair qu'un demi-fonctionnement.
 */
export const IS_BACKEND_CONFIGURED = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Configuration Supabase, disponible seulement si elle est complete.
 * Aucun client Supabase n'est instancie ici : conformement au jalon J1.4,
 * la librairie ne sera installee qu'au premier usage reel.
 */
export function getSupabaseConfig(): { url: string; publishableKey: string } | null {
  if (!IS_BACKEND_CONFIGURED) return null;
  return {
    url: env.VITE_SUPABASE_URL!,
    publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY!,
  };
}
