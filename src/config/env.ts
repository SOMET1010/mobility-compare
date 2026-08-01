/**
 * VALIDATION DE L'ENVIRONNEMENT
 * Une variable manquante doit echouer au demarrage, pas au premier appel
 * reseau en production.
 *
 * SECURITE (ADR-002) : seules des valeurs PUBLIQUES figurent ici. Toute
 * variable `VITE_*` est embarquee dans le bundle client. Un secret ne passe
 * jamais par ce fichier.
 */

import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  VITE_ROUTING_BASE_URL: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(
    `Configuration d'environnement invalide :\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  );
}

export const env = parsed.data;

/** Vrai quand le socle tourne sans backend configure (etat du jalon J1). */
export const IS_BACKEND_CONFIGURED = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
