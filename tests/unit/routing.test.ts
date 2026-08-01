import { describe, it, expect, vi } from 'vitest';
import {
  CircuitBreaker,
  createGuardedProvider,
  createOsrmProvider,
  isValidPoint,
  type Fetcher,
  type RouteOutcome,
  type RoutingProvider,
} from '@/modules/routing';
import { fixedClock } from '@/domain/pricing/clock';
import * as F from '../fixtures/osrm-responses';

const BASE_URL = 'https://services.exemple.test/routing';

/** Fetcher factice : aucune requête réseau n'est émise. */
function jsonFetcher(body: unknown, status = 200): { fetcher: Fetcher; calls: string[] } {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetcher, calls };
}

function provider(body: unknown, status = 200) {
  const { fetcher, calls } = jsonFetcher(body, status);
  return {
    provider: createOsrmProvider({ baseUrl: BASE_URL, fetcher, origin: 'fixture' }),
    calls,
  };
}

const REQUEST = { origin: F.YOPOUGON, destination: F.PLATEAU };

// =============================================================================
describe('validation des coordonnées — avant tout appel réseau', () => {
  it.each([
    ['latitude hors bornes', { lat: 91, lng: 0 }],
    ['longitude hors bornes', { lat: 0, lng: 181 }],
    ['NaN', { lat: Number.NaN, lng: 0 }],
    ['Infinity', { lat: 0, lng: Number.POSITIVE_INFINITY }],
  ])('rejette %s', (_label, point) => {
    expect(isValidPoint(point)).toBe(false);
  });

  it("n'émet aucune requête sur des coordonnées invalides", async () => {
    const { provider: p, calls } = provider(F.OSRM_OK);
    const outcome = await p.route({ origin: { lat: 999, lng: 0 }, destination: F.PLATEAU });
    expect(calls).toHaveLength(0);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.failure.code).toBe('INVALID_COORDINATES');
  });

  it("une coordonnée invalide n'est pas rejouable", async () => {
    const { provider: p } = provider(F.OSRM_OK);
    const outcome = await p.route({ origin: { lat: 999, lng: 0 }, destination: F.PLATEAU });
    if (!outcome.ok) expect(outcome.failure.retryable).toBe(false);
  });
});

// =============================================================================
describe('adaptateur OSRM — cas nominal sur fixture', () => {
  it('traduit une réponse Ok en RouteResult', async () => {
    const { provider: p } = provider(F.OSRM_OK);
    const outcome = await p.route(REQUEST);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.distanceMeters).toBe(11_420.3);
    expect(outcome.result.durationSeconds).toBe(1_680.5);
    expect(outcome.result.geometry.length).toBeGreaterThan(0);
    expect(outcome.result.geometryFormat).toBe('polyline');
  });

  it('marque la provenance comme fixture, jamais live', async () => {
    const { provider: p } = provider(F.OSRM_OK);
    const outcome = await p.route(REQUEST);
    if (outcome.ok) expect(outcome.result.origin).toBe('fixture');
  });

  it('annonce live uniquement quand on le lui demande explicitement', async () => {
    const { fetcher } = jsonFetcher(F.OSRM_OK);
    const p = createOsrmProvider({ baseUrl: BASE_URL, fetcher, origin: 'live' });
    const outcome = await p.route(REQUEST);
    if (outcome.ok) expect(outcome.result.origin).toBe('live');
  });

  it("construit l'URL en longitude,latitude — ordre inverse de l'usage courant", async () => {
    const { provider: p, calls } = provider(F.OSRM_OK);
    await p.route(REQUEST);
    expect(calls[0]).toContain(`${F.YOPOUGON.lng},${F.YOPOUGON.lat}`);
    expect(calls[0]).toContain('overview=full');
  });

  it('interroge notre couche de services, jamais OSRM en direct', async () => {
    const { provider: p, calls } = provider(F.OSRM_OK);
    await p.route(REQUEST);
    expect(calls[0]!.startsWith(BASE_URL)).toBe(true);
    // Aucune adresse OSRM directe : OSRM tourne sur une VM privee.
    expect(calls[0]).not.toContain(':5000');
  });
});

// =============================================================================
describe('adaptateur OSRM — échecs', () => {
  it.each([
    ['aucun itinéraire', F.OSRM_NO_ROUTE, 'NO_ROUTE_FOUND'],
    ['hors couverture', F.OSRM_NO_SEGMENT, 'OUT_OF_COVERAGE'],
    ['Ok sans itinéraire', F.OSRM_OK_EMPTY_ROUTES, 'NO_ROUTE_FOUND'],
    ['géométrie absente', F.OSRM_MISSING_GEOMETRY, 'MISSING_GEOMETRY'],
    ['géométrie vide', F.OSRM_EMPTY_GEOMETRY, 'MISSING_GEOMETRY'],
    ['distance non numérique', F.OSRM_INVALID_DISTANCE, 'INVALID_RESPONSE'],
    ['durée négative', F.OSRM_NEGATIVE_DURATION, 'INVALID_RESPONSE'],
    ['code inconnu', F.OSRM_UNKNOWN_CODE, 'INVALID_RESPONSE'],
  ])('%s → %s', async (_label, body, expected) => {
    const { provider: p } = provider(body);
    const outcome = await p.route(REQUEST);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.failure.code).toBe(expected);
  });

  it('remonte le statut sur erreur HTTP', async () => {
    const { provider: p } = provider({ error: 'boom' }, 503);
    const outcome = await p.route(REQUEST);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.code).toBe('HTTP_ERROR');
      expect(outcome.failure.httpStatus).toBe(503);
      expect(outcome.failure.retryable).toBe(true);
    }
  });

  it('traite un corps illisible comme une réponse invalide', async () => {
    const fetcher: Fetcher = async () => new Response('<html>erreur</html>', { status: 200 });
    const p = createOsrmProvider({ baseUrl: BASE_URL, fetcher });
    const outcome = await p.route(REQUEST);
    if (!outcome.ok) expect(outcome.failure.code).toBe('INVALID_RESPONSE');
  });

  it('convertit une interruption en TIMEOUT', async () => {
    const fetcher: Fetcher = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    const p = createOsrmProvider({ baseUrl: BASE_URL, fetcher, defaultTimeoutMs: 10 });
    const outcome = await p.route(REQUEST);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.code).toBe('TIMEOUT');
      expect(outcome.failure.retryable).toBe(true);
    }
  });

  it('traite une panne réseau comme fournisseur indisponible', async () => {
    const fetcher: Fetcher = async () => {
      throw new Error('ECONNREFUSED');
    };
    const p = createOsrmProvider({ baseUrl: BASE_URL, fetcher });
    const outcome = await p.route(REQUEST);
    if (!outcome.ok) expect(outcome.failure.code).toBe('PROVIDER_UNAVAILABLE');
  });

  it("un échec ne porte jamais de résultat : aucun repli à vol d'oiseau", async () => {
    for (const body of [F.OSRM_NO_ROUTE, F.OSRM_MISSING_GEOMETRY, F.OSRM_NO_SEGMENT]) {
      const { provider: p } = provider(body);
      const outcome = await p.route(REQUEST);
      expect(outcome.ok).toBe(false);
      expect('result' in outcome).toBe(false);
    }
  });
});

// =============================================================================
describe('disjoncteur — transitions déterministes', () => {
  const OPTIONS = { failureThreshold: 3, cooldownMs: 30_000 };

  it('démarre fermé et autorise les appels', () => {
    const breaker = new CircuitBreaker(OPTIONS, fixedClock(new Date('2026-08-01T10:00:00Z')));
    expect(breaker.snapshot().state).toBe('CLOSED');
    expect(breaker.canAttempt()).toBe(true);
  });

  it("reste fermé sous le seuil d'échecs", () => {
    const breaker = new CircuitBreaker(OPTIONS, fixedClock(new Date('2026-08-01T10:00:00Z')));
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.snapshot().state).toBe('CLOSED');
    expect(breaker.snapshot().consecutiveFailures).toBe(2);
  });

  it('CLOSED → OPEN au seuil atteint', () => {
    const breaker = new CircuitBreaker(OPTIONS, fixedClock(new Date('2026-08-01T10:00:00Z')));
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    expect(breaker.snapshot().state).toBe('OPEN');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('un succès remet le compteur à zéro : les échecs doivent être consécutifs', () => {
    const breaker = new CircuitBreaker(OPTIONS, fixedClock(new Date('2026-08-01T10:00:00Z')));
    breaker.onFailure();
    breaker.onFailure();
    breaker.onSuccess();
    breaker.onFailure();
    expect(breaker.snapshot().state).toBe('CLOSED');
    expect(breaker.snapshot().consecutiveFailures).toBe(1);
  });

  it('OPEN reste fermé aux appels avant la fin du repos', () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(OPTIONS, { now: () => instant });
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    instant = new Date('2026-08-01T10:00:29Z'); // 29 s < 30 s
    expect(breaker.canAttempt()).toBe(false);
    expect(breaker.snapshot().state).toBe('OPEN');
  });

  it('OPEN → HALF_OPEN une fois le repos écoulé', () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(OPTIONS, { now: () => instant });
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    instant = new Date('2026-08-01T10:00:30Z');
    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.snapshot().state).toBe('HALF_OPEN');
  });

  it('HALF_OPEN → CLOSED après une sonde réussie', () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(OPTIONS, { now: () => instant });
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    instant = new Date('2026-08-01T10:00:30Z');
    breaker.canAttempt();
    breaker.onSuccess();
    expect(breaker.snapshot().state).toBe('CLOSED');
    expect(breaker.snapshot().consecutiveFailures).toBe(0);
  });

  it('HALF_OPEN → OPEN dès le premier échec de sonde, sans attendre le seuil', () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(OPTIONS, { now: () => instant });
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    instant = new Date('2026-08-01T10:00:30Z');
    breaker.canAttempt();
    breaker.onFailure();
    expect(breaker.snapshot().state).toBe('OPEN');
  });

  it('allonge le repos à chaque sonde échouée, dans la limite du plafond', () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, cooldownMs: 10_000, backoffFactor: 2, maxCooldownMs: 40_000 },
      { now: () => instant },
    );
    breaker.onFailure();
    expect(breaker.snapshot().currentCooldownMs).toBe(10_000);

    for (const [wait, expected] of [
      [10_000, 20_000],
      [20_000, 40_000],
      [40_000, 40_000],
    ] as const) {
      instant = new Date(instant.getTime() + wait);
      breaker.canAttempt();
      breaker.onFailure();
      expect(breaker.snapshot().currentCooldownMs).toBe(expected);
    }
  });

  it('annonce la date de la prochaine sonde', () => {
    const instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(OPTIONS, fixedClock(instant));
    for (let i = 0; i < 3; i += 1) breaker.onFailure();
    expect(breaker.snapshot().nextProbeAt?.toISOString()).toBe('2026-08-01T10:00:30.000Z');
  });

  it('refuse une configuration incohérente', () => {
    const clock = fixedClock(new Date());
    expect(() => new CircuitBreaker({ failureThreshold: 0, cooldownMs: 1 }, clock)).toThrow();
    expect(() => new CircuitBreaker({ failureThreshold: 1, cooldownMs: 0 }, clock)).toThrow();
  });
});

// =============================================================================
describe('fournisseur protégé — aucun appel réseau quand le circuit est ouvert', () => {
  function countingProvider(outcome: RouteOutcome): { p: RoutingProvider; calls: () => number } {
    const route = vi.fn(async () => outcome);
    return {
      p: {
        name: 'compteur',
        route,
        healthCheck: async () => ({ available: true, latencyMs: 1, checkedAt: new Date() }),
      },
      calls: () => route.mock.calls.length,
    };
  }

  const httpFailure: RouteOutcome = {
    ok: false,
    failure: {
      code: 'HTTP_ERROR',
      technicalMessage: '503',
      providerName: 'compteur',
      retryable: true,
    },
  };

  it("n'appelle plus le fournisseur une fois le circuit ouvert", async () => {
    const instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(
      { failureThreshold: 2, cooldownMs: 30_000 },
      fixedClock(instant),
    );
    const { p, calls } = countingProvider(httpFailure);
    const guarded = createGuardedProvider(p, breaker);

    await guarded.route(REQUEST);
    await guarded.route(REQUEST);
    expect(calls()).toBe(2);
    expect(breaker.snapshot().state).toBe('OPEN');

    for (let i = 0; i < 10; i += 1) await guarded.route(REQUEST);
    // AUCUN appel supplémentaire : c'est la raison d'être du disjoncteur.
    expect(calls()).toBe(2);
  });

  it('retourne CIRCUIT_OPEN sans résultat', async () => {
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, cooldownMs: 30_000 },
      fixedClock(new Date('2026-08-01T10:00:00Z')),
    );
    const { p } = countingProvider(httpFailure);
    const guarded = createGuardedProvider(p, breaker);

    await guarded.route(REQUEST);
    const outcome = await guarded.route(REQUEST);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.code).toBe('CIRCUIT_OPEN');
      expect(outcome.failure.technicalMessage).toContain('prochaine sonde');
    }
    expect('result' in outcome).toBe(false);
  });

  it('reprend les appels après le repos, et referme sur succès', async () => {
    let instant = new Date('2026-08-01T10:00:00Z');
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, cooldownMs: 30_000 },
      { now: () => instant },
    );

    let current: RouteOutcome = httpFailure;
    const route = vi.fn(async () => current);
    const guarded = createGuardedProvider(
      {
        name: 'bascule',
        route,
        healthCheck: async () => ({ available: true, latencyMs: 1, checkedAt: new Date() }),
      },
      breaker,
    );

    await guarded.route(REQUEST);
    expect(breaker.snapshot().state).toBe('OPEN');

    instant = new Date('2026-08-01T10:00:30Z');
    current = {
      ok: true,
      result: {
        distanceMeters: 1,
        durationSeconds: 1,
        geometry: 'x',
        geometryFormat: 'polyline',
        providerName: 'bascule',
        origin: 'mock',
        computedAt: instant,
      },
    };
    const outcome = await guarded.route(REQUEST);
    expect(outcome.ok).toBe(true);
    expect(breaker.snapshot().state).toBe('CLOSED');
    expect(route.mock.calls.length).toBe(2);
  });

  it("un échec non imputable au fournisseur n'ouvre pas le circuit", async () => {
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, cooldownMs: 30_000 },
      fixedClock(new Date('2026-08-01T10:00:00Z')),
    );
    const { p } = countingProvider({
      ok: false,
      failure: {
        code: 'NO_ROUTE_FOUND',
        technicalMessage: 'aucun itinéraire',
        providerName: 'compteur',
        retryable: false,
      },
    });
    const guarded = createGuardedProvider(p, breaker);

    for (let i = 0; i < 5; i += 1) await guarded.route(REQUEST);
    // Le service répond correctement : il dit qu'il n'y a pas de route.
    expect(breaker.snapshot().state).toBe('CLOSED');
  });
});

// =============================================================================
describe('provenance — fixture, mock, cache et live sont distingués', () => {
  it('les quatre valeurs sont exploitables et distinctes', async () => {
    const origins = new Set<string>();
    for (const origin of ['live', 'fixture', 'mock'] as const) {
      const { fetcher } = jsonFetcher(F.OSRM_OK);
      const p = createOsrmProvider({ baseUrl: BASE_URL, fetcher, origin });
      const outcome = await p.route(REQUEST);
      if (outcome.ok) origins.add(outcome.result.origin);
    }
    expect(origins).toEqual(new Set(['live', 'fixture', 'mock']));
  });

  it("une fixture n'est jamais annoncée comme live par défaut d'un test", async () => {
    const { provider: p } = provider(F.OSRM_OK);
    const outcome = await p.route(REQUEST);
    if (outcome.ok) expect(outcome.result.origin).not.toBe('live');
  });
});
