/**
 * ADAPTATEUR OSRM
 * =============================================================================
 * Traduit le protocole OSRM vers le contrat `RoutingProvider`. Aucun
 * vocabulaire OSRM ne franchit cette frontiere : le reste de l'application
 * ignore que OSRM existe.
 *
 * FRONTIERE D'INFRASTRUCTURE : cet adaptateur ne s'adresse PAS a OSRM
 * directement depuis le navigateur. Le `baseUrl` designe notre couche de
 * services, qui porte authentification, quotas, delais et journalisation.
 * OSRM tourne sur une VM privee, jamais joignable depuis le client.
 * =============================================================================
 */

import {
  failure,
  isValidPoint,
  type ProviderHealth,
  type RouteOutcome,
  type RouteRequest,
  type RoutingProvider,
} from '../provider';

/** Injectable, pour tester sans reseau. */
export type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

export interface OsrmAdapterOptions {
  /** URL de NOTRE couche de services, jamais celle d'OSRM. */
  readonly baseUrl: string;
  readonly fetcher: Fetcher;
  readonly defaultTimeoutMs?: number;
  readonly providerName?: string;
  /** Provenance annoncee. `fixture` ou `mock` en test, `live` en production. */
  readonly origin?: 'live' | 'fixture' | 'mock';
}

/** Reponse OSRM, telle qu'attendue. Aucun champ n'est suppose present. */
interface OsrmResponse {
  code?: unknown;
  routes?: unknown;
  message?: unknown;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export function createOsrmProvider(options: OsrmAdapterOptions): RoutingProvider {
  const name = options.providerName ?? 'osrm';
  const origin = options.origin ?? 'live';
  const defaultTimeout = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(url: string, timeoutMs: number): Promise<RouteOutcome | Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await options.fetcher(url, { signal: controller.signal });
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      return isAbort
        ? failure('TIMEOUT', name, `Delai de ${timeoutMs} ms depasse`)
        : failure('PROVIDER_UNAVAILABLE', name, String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name,

    async route(request: RouteRequest): Promise<RouteOutcome> {
      // Controle prealable : aucune requete reseau sur des coordonnees fausses.
      if (!isValidPoint(request.origin) || !isValidPoint(request.destination)) {
        return failure('INVALID_COORDINATES', name, 'Coordonnees hors bornes ou non finies');
      }

      const { origin: from, destination: to } = request;
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url = `${options.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=polyline`;

      const outcome = await call(url, request.timeoutMs ?? defaultTimeout);
      if (!(outcome instanceof Response)) return outcome;
      const response = outcome;

      if (!response.ok) {
        return failure('HTTP_ERROR', name, `Reponse HTTP ${response.status}`, response.status);
      }

      let payload: OsrmResponse;
      try {
        payload = (await response.json()) as OsrmResponse;
      } catch (error) {
        return failure('INVALID_RESPONSE', name, `Corps illisible : ${String(error)}`);
      }

      if (payload.code === 'NoRoute') {
        return failure('NO_ROUTE_FOUND', name, 'Aucun itineraire entre ces points');
      }
      if (payload.code === 'NoSegment' || payload.code === 'NoMatch') {
        return failure('OUT_OF_COVERAGE', name, `Point hors du graphe : ${String(payload.code)}`);
      }
      if (payload.code !== 'Ok') {
        return failure(
          'INVALID_RESPONSE',
          name,
          `Code inattendu : ${String(payload.code ?? 'absent')}`,
        );
      }

      if (!Array.isArray(payload.routes) || payload.routes.length === 0) {
        return failure('NO_ROUTE_FOUND', name, 'Reponse Ok sans itineraire');
      }

      const route = payload.routes[0] as Record<string, unknown>;
      const distance = route['distance'];
      const duration = route['duration'];
      const geometry = route['geometry'];

      if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) {
        return failure('INVALID_RESPONSE', name, 'Distance absente ou invalide');
      }
      if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
        return failure('INVALID_RESPONSE', name, 'Duree absente ou invalide');
      }
      // Sans trace, pas de resultat : aucun repli a vol d'oiseau.
      if (typeof geometry !== 'string' || geometry.length === 0) {
        return failure('MISSING_GEOMETRY', name, 'Geometrie absente ou vide');
      }

      return {
        ok: true,
        result: {
          distanceMeters: distance,
          durationSeconds: duration,
          geometry,
          geometryFormat: 'polyline',
          providerName: name,
          origin,
          computedAt: new Date(),
        },
      };
    },

    async healthCheck(): Promise<ProviderHealth> {
      const startedAt = Date.now();
      const outcome = await call(`${options.baseUrl}/health`, defaultTimeout);
      const latencyMs = Date.now() - startedAt;
      const available = outcome instanceof Response && outcome.ok;
      return { available, latencyMs, checkedAt: new Date() };
    },
  };
}
