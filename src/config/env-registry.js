/**
 * REGISTRE DES VARIABLES D'ENVIRONNEMENT
 * =============================================================================
 * Source unique de vérité sur la PORTÉE de chaque variable.
 *
 * Ce fichier est volontairement en JavaScript pur, sans import : il est lu
 * aussi bien par le script de contrôle `prebuild` (Node, avant toute
 * compilation) que par les tests d'architecture. Une seule liste, deux usages —
 * il ne peut pas y avoir de divergence entre ce qui est documenté et ce qui est
 * vérifié.
 *
 * ADR-002 : toute variable préfixée `VITE_` est injectée dans le bundle client
 * par Vite. Elle est donc PUBLIQUE, définitivement et pour tous.
 * =============================================================================
 */

/**
 * Variables PUBLIQUES, embarquées dans le bundle navigateur.
 * N'y placer que ce qu'on accepterait de publier sur une page web.
 */
export const CLIENT_VARIABLES = [
  {
    name: 'VITE_SUPABASE_URL',
    required: false,
    description: "URL du projet Supabase. Publique par nature : elle figure dans chaque requête.",
  },
  {
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    required: false,
    description:
      "Clé publishable (sb_publishable_...). Privilèges faibles, soumise aux politiques RLS. C'est la SEULE clé Supabase autorisée côté navigateur.",
  },
  {
    name: 'VITE_ROUTING_BASE_URL',
    required: false,
    description:
      "URL de NOTRE couche de services de routage, jamais celle d'OSRM. OSRM tourne sur une VM privée, non joignable depuis le navigateur.",
  },
  {
    name: 'VITE_SENTRY_DSN',
    required: false,
    description: 'DSN Sentry. Publique par conception : conçue pour être exposée côté client.',
  },
  {
    name: 'VITE_SENTRY_ENABLE_DEV',
    required: false,
    description: "'true' pour activer le monitoring en local. Inactif par défaut.",
  },
  {
    name: 'VITE_APP_ENV',
    required: false,
    description: 'development | staging | production',
  },
];

/**
 * Variables SERVEUR. Jamais préfixées `VITE_`, jamais lues depuis `src/`.
 * Elles vivent dans les secrets Supabase ou ceux de la plateforme d'hébergement.
 *
 * Toute référence à l'un de ces noms depuis le code client fait échouer le build.
 */
export const SERVER_VARIABLES = [
  {
    name: 'SUPABASE_SECRET_KEY',
    description:
      'Clé secret (sb_secret_...). Contourne les politiques RLS. Edge Functions et scripts privilégiés uniquement.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Clé legacy service_role. À ne plus utiliser — remplacée par SUPABASE_SECRET_KEY.',
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    description: 'Secret de signature des jetons. Compromis, il permet de forger une identité.',
  },
  {
    name: 'SUPABASE_DB_PASSWORD',
    description: 'Mot de passe Postgres. Migrations et accès direct uniquement.',
  },
  {
    name: 'SMS_PROVIDER_PRIMARY_CREDENTIALS',
    description: 'Identifiants du fournisseur SMS principal. Voir SPEC_Module_OTP_SMS §3.',
  },
  {
    name: 'SMS_PROVIDER_FALLBACK_CREDENTIALS',
    description: 'Identifiants du fournisseur SMS de repli.',
  },
  {
    name: 'OTP_HASH_PEPPER',
    description:
      "Poivre du hachage des codes OTP. Exposé, il rend le hachage réversible par force brute.",
  },
];

/**
 * Fragments interdits dans un nom de variable `VITE_*`.
 * Filet de sécurité pour les variables futures que personne n'a encore écrites :
 * la liste nominative ci-dessus ne peut pas les anticiper.
 */
export const FORBIDDEN_CLIENT_FRAGMENTS = [
  'SECRET',
  'SERVICE_ROLE',
  'SERVICE_KEY',
  'PRIVATE',
  'PASSWORD',
  'CREDENTIAL',
  'PEPPER',
  'JWT_SECRET',
  'ADMIN_KEY',
  'DB_URL',
];

/** Nom de variable serveur ou fragment interdit ? */
export function isForbiddenInClient(name) {
  if (SERVER_VARIABLES.some((variable) => variable.name === name)) return true;
  if (!name.startsWith('VITE_')) return false;
  return FORBIDDEN_CLIENT_FRAGMENTS.some((fragment) => name.includes(fragment));
}
