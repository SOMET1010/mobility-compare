/**
 * MODE DÉMONSTRATION — GARDE-FOUS
 * =============================================================================
 * Ce dossier alimente les MOTEURS RÉELS (tarification dynamique + classement
 * naturel) avec des données 100 % FICTIVES, afin de présenter l'expérience
 * utilisateur sans attendre les preuves externes (routage OSRM, grilles
 * tarifaires, relevés terrain).
 *
 * DOCTRINE : ce n'est pas une entorse à « zéro donnée inventée ». Chaque écran
 * et chaque valeur porte la mention SIMULATION ; l'indice de confiance terrain
 * reste 0 ; aucune valeur n'est présentée comme réelle. Le jour où les données
 * réelles existent, on remplace le contenu de `scenario.ts` — le parcours et la
 * mécanique de calcul, eux, ne changent pas.
 * =============================================================================
 */

/** Bandeau permanent, affiché sur chaque écran du mode Démonstration. */
export const SIMULATION_BANNER = 'MAQUETTE — DONNÉES 100 % FICTIVES, NON CONTRACTUELLES';

/**
 * Fournisseur de routage inscrit dans la trace des calculs de démonstration.
 * En clair : aucun itinéraire OSRM réel n'a été calculé (DEP-001 non levée).
 */
export const DEMO_ROUTING_PROVIDER = 'SIMULATION (aucun OSRM — DEP-001)';

/**
 * Valeur du temps utilisée pour le badge « meilleur rapport prix/temps ».
 * EXEMPLE non validé : un vrai arbitrage métier (§13) fixera cette valeur.
 */
export const DEMO_TIME_VALUE_XOF_PER_MIN = 25;
