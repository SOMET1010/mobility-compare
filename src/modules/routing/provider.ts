/**
 * CONTRAT RoutingProvider
 * Le code applicatif n'appelle JAMAIS OSRM (ni Mapbox, ni Google) directement.
 * Il passe par cette interface. Changer de fournisseur ne doit toucher que
 * le dossier adapters/.
 *
 * Decision : OSRM auto-heberge en fournisseur principal. Mapbox et Google
 * restent disponibles comme outils de controle qualite ponctuel, jamais comme
 * dependance centrale. Voir PLAN_TECHNIQUE_V0 §1 (D2).
 */

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface RouteRequest {
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly departureAt?: Date;
}

export interface RouteResult {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  /** Polyline encodee ou GeoJSON, selon le fournisseur. */
  readonly geometry: string;
  readonly providerName: string;
  readonly computedAt: Date;
}

export type RoutingErrorCode =
  'NO_ROUTE_FOUND' | 'OUT_OF_COVERAGE' | 'PROVIDER_UNAVAILABLE' | 'INVALID_COORDINATES' | 'UNKNOWN';

export interface RoutingProvider {
  readonly name: string;
  route(request: RouteRequest): Promise<RouteResult>;
  healthCheck(): Promise<{ available: boolean; latencyMs: number }>;
}
