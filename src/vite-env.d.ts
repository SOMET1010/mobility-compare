/// <reference types="vite/client" />

/**
 * Typage des variables d'environnement exposees au client.
 * SECURITE (ADR-002) : cette liste ne doit contenir que des valeurs PUBLIQUES.
 * Ajouter ici une variable de secret revient a la publier dans le bundle.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Couche de services de routage, jamais OSRM en direct. */
  readonly VITE_ROUTING_BASE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENABLE_DEV?: string;
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
