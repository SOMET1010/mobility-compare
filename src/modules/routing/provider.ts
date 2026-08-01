/**
 * CONTRAT DE ROUTAGE
 * =============================================================================
 * Independant d'OSRM, de HTTP et de tout fournisseur cartographique.
 * Le code applicatif ne connait que ce fichier. Changer de fournisseur ne doit
 * toucher que le dossier `adapters/`.
 *
 * INTERDIT PAR CONCEPTION : aucun repli vers une distance a vol d'oiseau.
 * Une distance orthodromique n'est pas une distance routiere — a Abidjan, entre
 * lagune et ponts, l'ecart depasse couramment le facteur deux. Un repli
 * silencieux produirait un prix faux presente comme un prix reel.
 * Quand le routage echoue, il n'y a pas de prix. C'est l'invariant I1.
 * =============================================================================
 */

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface RouteRequest {
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  /** Instant de depart souhaite. N'influence pas le routage de base. */
  readonly departureAt?: Date;
  /** Delai au-dela duquel la requete est abandonnee. */
  readonly timeoutMs?: number;
}

/**
 * Provenance d'un resultat. Distinction non cosmetique : une fixture ne prouve
 * pas le fonctionnement d'un serveur, et un resultat de cache peut etre perime.
 *
 *   live     reponse d'un service de routage reel, a l'instant de la requete
 *   cache    resultat live anterieur, reutilise
 *   fixture  donnee figee de test — NE PROUVE RIEN sur un serveur reel
 *   mock     reponse fabriquee par un double de test
 */
export type RouteOrigin = 'live' | 'cache' | 'fixture' | 'mock';

export interface RouteResult {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  /** Geometrie encodee. Jamais vide : sans trace, le resultat est un echec. */
  readonly geometry: string;
  readonly geometryFormat: 'polyline' | 'polyline6' | 'geojson';
  readonly providerName: string;
  readonly origin: RouteOrigin;
  readonly computedAt: Date;
}

export type RouteFailureCode =
  | 'NO_ROUTE_FOUND'
  | 'OUT_OF_COVERAGE'
  | 'INVALID_COORDINATES'
  | 'INVALID_RESPONSE'
  | 'MISSING_GEOMETRY'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'CIRCUIT_OPEN'
  | 'UNKNOWN';

export interface RouteFailure {
  readonly code: RouteFailureCode;
  /** Message technique, destine aux journaux. Jamais montre a l'usager. */
  readonly technicalMessage: string;
  readonly providerName: string;
  /** Vrai si une nouvelle tentative a du sens. */
  readonly retryable: boolean;
  /** Statut HTTP si l'echec en provient. */
  readonly httpStatus?: number;
}

export type RouteOutcome =
  | { readonly ok: true; readonly result: RouteResult }
  | { readonly ok: false; readonly failure: RouteFailure };

export interface ProviderHealth {
  readonly available: boolean;
  readonly latencyMs: number;
  readonly checkedAt: Date;
}

export interface RoutingProvider {
  readonly name: string;
  route(request: RouteRequest): Promise<RouteOutcome>;
  healthCheck(): Promise<ProviderHealth>;
}

/** Echecs qui justifient une nouvelle tentative ou une bascule. */
const RETRYABLE: readonly RouteFailureCode[] = [
  'TIMEOUT',
  'HTTP_ERROR',
  'PROVIDER_UNAVAILABLE',
  'UNKNOWN',
];

export function failure(
  code: RouteFailureCode,
  providerName: string,
  technicalMessage: string,
  httpStatus?: number,
): RouteOutcome {
  return {
    ok: false,
    failure: {
      code,
      technicalMessage,
      providerName,
      retryable: RETRYABLE.includes(code),
      ...(httpStatus === undefined ? {} : { httpStatus }),
    },
  };
}

/** Coordonnee exploitable ? Le controle a lieu avant tout appel reseau. */
export function isValidPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}
