/**
 * SCÉNARIO DE DÉMONSTRATION — SOURCE DE DONNÉES FICTIVES
 * =============================================================================
 * SEULE COUTURE À REMPLACER le jour du réel. Ce fichier ne contient QUE des
 * données inventées (corridors, durées, tarifs forfaitaires, paramètres de
 * grille). Il les fait passer par les MOTEURS RÉELS :
 *   - `computeFare()`  → prix + trace de calcul (invariant I2)
 *   - `rankOptions()`  → ordre + badges neutres (invariant I3)
 *
 * Quand DEP-001 (routage OSRM), DEP-002 (grille officielle) et DEP-004
 * (relevés terrain) seront levées, on remplace `getComparison()` par une
 * implémentation réelle : les écrans et la mécanique ne changent pas.
 * =============================================================================
 */

import { computeFare, validateFareGrid, type FareGrid } from '@/domain/pricing/dynamic';
import { fixedClock } from '@/domain/pricing/clock';
import { rankOptions, type RankableOption, type RankingResult } from '@/domain/ranking';
import { DEMO_ROUTING_PROVIDER, DEMO_TIME_VALUE_XOF_PER_MIN } from './simulation';

export type DemoMode = 'VTC' | 'TAXI' | 'WORO' | 'GBAKA';

export interface ModeMeta {
  readonly code: DemoMode;
  readonly label: string;
  readonly emoji: string;
  readonly note: string;
  /** Couleur catégorielle (donnée), distincte de l'accent de l'app. */
  readonly color: string;
  readonly kind: 'METERED' | 'FLAT';
}

export const MODE_META: Record<DemoMode, ModeMeta> = {
  VTC: {
    code: 'VTC',
    label: 'VTC',
    emoji: '🚗',
    note: 'réservé, porte-à-porte',
    color: '#3B4A57',
    kind: 'METERED',
  },
  TAXI: {
    code: 'TAXI',
    label: 'Taxi compteur',
    emoji: '🚕',
    note: 'direct, au compteur',
    color: '#E8622A',
    kind: 'METERED',
  },
  WORO: {
    code: 'WORO',
    label: 'Woro-woro',
    emoji: '🚐',
    note: 'partagé',
    color: '#2E9E5B',
    kind: 'FLAT',
  },
  GBAKA: {
    code: 'GBAKA',
    label: 'Gbaka',
    emoji: '🚌',
    note: 'minibus, ligne fixe',
    color: '#3B5BA5',
    kind: 'FLAT',
  },
};

/** Paramètres de grille au compteur (fictifs) pour les modes METERED. */
const METERED_PARAMS: Record<
  'VTC' | 'TAXI',
  { pickupFee: number; perKilometer: number; perMinute: number; minimumFare: number }
> = {
  VTC: { pickupFee: 800, perKilometer: 260, perMinute: 30, minimumFare: 1500 },
  TAXI: { pickupFee: 500, perKilometer: 190, perMinute: 25, minimumFare: 1000 },
};

interface FixedFeeSpec {
  readonly code: string;
  readonly label: string;
  readonly amount: number;
}

interface Leg {
  readonly mode: DemoMode;
  readonly providerId: string;
  readonly durationMin: number;
  readonly waitMin?: number;
  /** Renseigné pour les modes FLAT : tarif forfaitaire fictif de ce corridor. */
  readonly flatFare?: number;
  /** Frais fixes fictifs (ex. supplément aéroport). */
  readonly fixedFees?: readonly FixedFeeSpec[];
}

export interface DemoCorridor {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly km: number;
  readonly legs: readonly Leg[];
}

/** Corridors représentatifs d'Abidjan — TOUS fictifs. */
export const CORRIDORS: readonly DemoCorridor[] = [
  {
    id: 'cocody-plateau',
    from: 'Cocody',
    to: 'Plateau',
    km: 9.5,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 22 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 26 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 40, waitMin: 5, flatFare: 300 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 48, waitMin: 8, flatFare: 250 },
    ],
  },
  {
    id: 'yopougon-adjame',
    from: 'Yopougon',
    to: 'Adjamé',
    km: 12.8,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 28 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 32 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 52, waitMin: 6, flatFare: 350 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 60, waitMin: 10, flatFare: 300 },
    ],
  },
  {
    id: 'marcory-aeroport',
    from: 'Marcory',
    to: 'Aéroport',
    km: 8.2,
    legs: [
      {
        mode: 'VTC',
        providerId: 'op-vtc-demo',
        durationMin: 18,
        fixedFees: [{ code: 'AIRPORT', label: 'Supplément aéroport (exemple)', amount: 1000 }],
      },
      {
        mode: 'TAXI',
        providerId: 'op-taxi-demo',
        durationMin: 21,
        fixedFees: [{ code: 'AIRPORT', label: 'Supplément aéroport (exemple)', amount: 1000 }],
      },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 34, waitMin: 5, flatFare: 500 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 40, waitMin: 12, flatFare: 400 },
    ],
  },
];

const DEMO_INSTANT = new Date('2026-08-01T08:42:00Z');
const CLOCK = fixedClock(DEMO_INSTANT);
const VALID_FROM = new Date('2026-01-01T00:00:00Z');

/** Construit une grille fictive VALIDE pour une prestation donnée. */
function buildGrid(leg: Leg): FareGrid {
  const base = {
    providerId: leg.providerId,
    version: 'demo-0',
    currency: 'XOF' as const,
    perWaitingMinute: 0,
    timeWindows: [],
    zoneSurcharges: [],
    fixedFees: (leg.fixedFees ?? []).map((f) => ({
      code: f.code,
      label: f.label,
      amount: f.amount,
    })),
    maxTotalMultiplier: 3,
    taxRate: 0,
    roundingStep: 5,
    roundingMode: 'nearest' as const,
    policies: {
      multiplierComposition: { mode: 'MAX' as const, status: 'UNVALIDATED' as const },
      taxBase: { mode: 'TOTAL_BEFORE_TAX' as const, status: 'UNVALIDATED' as const },
    },
    basis: 'OBSERVED' as const,
    sourceRef: null,
    validFrom: VALID_FROM,
    validTo: null,
  };

  const shape =
    leg.flatFare !== undefined
      ? {
          ...base,
          pickupFee: leg.flatFare,
          perKilometer: 0,
          perMinute: 0,
          minimumFare: leg.flatFare,
        }
      : { ...base, ...METERED_PARAMS[leg.mode as 'VTC' | 'TAXI'] };

  const result = validateFareGrid(shape);
  if (!result.valid) {
    // Ne devrait jamais arriver : les données de démo sont fixes et valides.
    throw new Error(`Grille de démonstration invalide : ${result.errors.join(', ')}`);
  }
  return result.grid;
}

export interface DemoComparison {
  readonly corridor: DemoCorridor;
  readonly options: readonly RankableOption[];
  readonly ranking: RankingResult;
  /** Valeur du temps (exemple) employée pour « meilleur rapport ». */
  readonly timeValueXofPerMinute: number;
}

/**
 * Construit la comparaison d'un corridor en passant par les moteurs réels.
 * `getComparison(id)` est la couture : une implémentation réelle la remplacera.
 */
export function getComparison(corridorId: string): DemoComparison | null {
  const corridor = CORRIDORS.find((c) => c.id === corridorId);
  if (!corridor) return null;

  const options: RankableOption[] = corridor.legs.map((leg) => {
    const grid = buildGrid(leg);
    const fare = computeFare(
      {
        grid,
        trip: {
          distanceMeters: Math.round(corridor.km * 1000),
          durationSeconds: leg.durationMin * 60,
          waitingSeconds: (leg.waitMin ?? 0) * 60,
          routingProvider: DEMO_ROUTING_PROVIDER,
        },
        departureAt: DEMO_INSTANT,
      },
      CLOCK,
    );
    return {
      optionId: `${leg.mode}-${corridor.id}`,
      providerId: leg.providerId,
      mode: leg.mode,
      fare,
      durationSeconds: leg.durationMin * 60,
      waitSeconds: leg.waitMin !== undefined ? leg.waitMin * 60 : null,
    };
  });

  const ranking = rankOptions(options, {
    criterion: 'PRICE_TIME',
    timeValueXofPerMinute: DEMO_TIME_VALUE_XOF_PER_MIN,
  });

  return { corridor, options, ranking, timeValueXofPerMinute: DEMO_TIME_VALUE_XOF_PER_MIN };
}
