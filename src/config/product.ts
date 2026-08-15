/**
 * IDENTITÉ PRODUIT — POINT UNIQUE DE VÉRITÉ
 * =============================================================================
 * Le nom commercial n'est PAS arrêté. Voir docs/adr/ADR-001.
 *
 * RÈGLE : toute occurrence du nom du produit dans l'application passe par ce
 * fichier. Aucune chaîne de marque en dur ailleurs dans `src/`.
 * Un test d'architecture (tests/architecture/) fait échouer la CI si le nom de
 * travail apparaît hors de ce fichier.
 *
 * Le renommage définitif doit se limiter à :
 *   1. ce fichier
 *   2. le champ `name` de package.json
 *   3. le nom du dépôt Git
 *   4. la liste d'exclusion du test d'architecture
 *
 * Ne jamais introduire ce nom dans : migrations SQL, noms de tables, noms de
 * fonctions Edge, noms de buckets, clés de secrets, noms de domaine métier.
 * =============================================================================
 */

export const PRODUCT = {
  /** Nom de travail interne. Provisoire — ADR-001. */
  workingName: 'MobilityCompare',

  /** Identifiant technique (slug). Provisoire — ADR-001. */
  technicalName: 'mobility_compare',

  /**
   * Nom affiché à l'usager. Arrêté par le décideur (Patrick SOMET) : « MOBILIS ».
   * Réserve ouverte : un « Mobilis » télécom existe (Algérie) — vérification de
   * marque à mener avant tout dépôt de domaine ou de Sender ID (ADR-001 / DEP-007).
   * Ces démarches réglementées restent donc NON lancées ; seul l'affichage change.
   */
  displayName: 'MOBILIS',

  /** Baseline produit. */
  tagline: 'Le comparateur neutre des mobilités urbaines' as string | null,

  /**
   * Sender ID SMS — 11 caractères alphanumériques maximum.
   * NON DÉPOSÉ. Aucune demande ne doit être lancée avant ADR-001.
   * Voir SPEC_Module_OTP_SMS §10.
   */
  smsSenderId: null as string | null,

  /** Aucun domaine réservé à ce stade — ADR-001. */
  productionDomain: null as string | null,

  /** Périmètre géographique de la V1. */
  scope: {
    country: 'CI',
    countryName: "Côte d'Ivoire",
    city: 'Abidjan',
    phonePrefix: '+225',
    currency: 'XOF',
    locale: 'fr-CI',
  },
} as const;

/**
 * Vrai tant que l'empreinte réglementée de la marque n'est pas sécurisée :
 * le nom affiché est arrêté (« MOBILIS »), mais le Sender ID SMS et le domaine
 * de production restent à déposer (ADR-001 / DEP-007). Permet de conditionner
 * l'affichage des mentions « provisoire ».
 */
export const IS_BRAND_PENDING = PRODUCT.smsSenderId === null || PRODUCT.productionDomain === null;
