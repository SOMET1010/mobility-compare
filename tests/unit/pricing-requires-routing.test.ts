import { describe, it, expect } from 'vitest';
import { computeFare, validateFareGrid, type FareGrid } from '@/domain/pricing/dynamic';
import { fixedClock } from '@/domain/pricing/clock';
import { createOsrmProvider, type Fetcher, type RouteOutcome } from '@/modules/routing';
import * as F from '../fixtures/osrm-responses';

/**
 * FRONTIERE ROUTAGE -> TARIFICATION
 * Aucun prix ne peut etre calcule sans mesure de trajet. Il n'existe aucun
 * chemin de code permettant d'estimer une distance autrement que par un
 * resultat de routage reussi.
 */

const CLOCK = fixedClock(new Date('2026-08-01T14:00:00Z'));

function grid(): FareGrid {
  const result = validateFareGrid({
    providerId: 'operateur-test',
    version: 'test',
    currency: 'XOF',
    pickupFee: 500,
    perKilometer: 200,
    perMinute: 30,
    perWaitingMinute: 0,
    minimumFare: 1000,
    timeWindows: [],
    zoneSurcharges: [],
    fixedFees: [],
    maxTotalMultiplier: 3,
    taxRate: 0,
    roundingStep: 5,
    roundingMode: 'nearest',
    policies: {
      multiplierComposition: { mode: 'MULTIPLICATIVE', status: 'UNVALIDATED' },
      taxBase: { mode: 'TOTAL_BEFORE_TAX', status: 'UNVALIDATED' },
    },
    basis: 'OBSERVED',
    sourceRef: null,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: null,
  });
  if (!result.valid) throw new Error(result.errors.join(', '));
  return result.grid;
}

/** Chaine complete : routage puis tarification. Aucun repli intermediaire. */
async function quote(outcome: RouteOutcome) {
  if (!outcome.ok) return { priced: false as const, failure: outcome.failure };
  const fare = computeFare(
    {
      grid: grid(),
      trip: {
        distanceMeters: outcome.result.distanceMeters,
        durationSeconds: outcome.result.durationSeconds,
        routingProvider: outcome.result.providerName,
      },
    },
    CLOCK,
  );
  return { priced: true as const, fare, origin: outcome.result.origin };
}

function providerFor(body: unknown, status = 200) {
  const fetcher: Fetcher = async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  return createOsrmProvider({
    baseUrl: 'https://services.exemple.test/routing',
    fetcher,
    origin: 'fixture',
  });
}

describe('aucun prix sans routage', () => {
  it.each([
    ['aucun itineraire', F.OSRM_NO_ROUTE],
    ['hors couverture', F.OSRM_NO_SEGMENT],
    ['geometrie absente', F.OSRM_MISSING_GEOMETRY],
    ['reponse invalide', F.OSRM_UNKNOWN_CODE],
  ])('%s : aucun prix produit', async (_label, body) => {
    const outcome = await providerFor(body).route({ origin: F.YOPOUGON, destination: F.PLATEAU });
    const result = await quote(outcome);
    expect(result.priced).toBe(false);
    expect('fare' in result).toBe(false);
  });

  it('erreur HTTP : aucun prix produit', async () => {
    const outcome = await providerFor({}, 500).route({
      origin: F.YOPOUGON,
      destination: F.PLATEAU,
    });
    expect((await quote(outcome)).priced).toBe(false);
  });

  it('un routage reussi produit un prix, et il porte sa provenance', async () => {
    const outcome = await providerFor(F.OSRM_OK).route({
      origin: F.YOPOUGON,
      destination: F.PLATEAU,
    });
    const result = await quote(outcome);
    expect(result.priced).toBe(true);
    if (!result.priced) return;
    expect(result.origin).toBe('fixture');
    expect(result.fare.available).toBe(true);
    if (result.fare.available) {
      // Le prix est calcule, mais issu d'une FIXTURE : il ne prouve rien
      // sur un serveur reel ni sur le graphe d'Abidjan.
      expect(result.fare.trace.routingProvider).toBe('osrm');
    }
  });
});
