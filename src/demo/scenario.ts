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
  {
    id: 'abobo-plateau',
    from: 'Abobo',
    to: 'Plateau',
    km: 15.4,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 34 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 38 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 58, waitMin: 7, flatFare: 400 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 68, waitMin: 12, flatFare: 300 },
    ],
  },
  {
    id: 'treichville-cocody',
    from: 'Treichville',
    to: 'Cocody',
    km: 7.8,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 19 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 22 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 35, waitMin: 5, flatFare: 300 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 42, waitMin: 8, flatFare: 250 },
    ],
  },
  {
    id: 'koumassi-adjame',
    from: 'Koumassi',
    to: 'Adjamé',
    km: 13.5,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 30 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 34 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 55, waitMin: 6, flatFare: 400 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 64, waitMin: 11, flatFare: 350 },
    ],
  },
  {
    id: 'portbouet-plateau',
    from: 'Port-Bouët',
    to: 'Plateau',
    km: 16.8,
    legs: [
      {
        mode: 'VTC',
        providerId: 'op-vtc-demo',
        durationMin: 26,
        fixedFees: [{ code: 'TOLL', label: 'Péage pont (exemple)', amount: 500 }],
      },
      {
        mode: 'TAXI',
        providerId: 'op-taxi-demo',
        durationMin: 30,
        fixedFees: [{ code: 'TOLL', label: 'Péage pont (exemple)', amount: 500 }],
      },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 60, waitMin: 8, flatFare: 500 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 72, waitMin: 14, flatFare: 400 },
    ],
  },
  {
    id: 'riviera-yopougon',
    from: 'Riviera',
    to: 'Yopougon',
    km: 22.0,
    legs: [
      { mode: 'VTC', providerId: 'op-vtc-demo', durationMin: 40 },
      { mode: 'TAXI', providerId: 'op-taxi-demo', durationMin: 45 },
      { mode: 'WORO', providerId: 'op-woro-demo', durationMin: 85, waitMin: 9, flatFare: 600 },
      { mode: 'GBAKA', providerId: 'op-gbaka-demo', durationMin: 95, waitMin: 15, flatFare: 500 },
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

/** Critère de tri proposé à l'usager. */
export type DemoCriterion = 'PRICE' | 'DURATION' | 'PRICE_TIME';

export const CRITERIA: readonly { readonly code: DemoCriterion; readonly label: string }[] = [
  { code: 'PRICE', label: 'Moins cher' },
  { code: 'DURATION', label: 'Plus rapide' },
  { code: 'PRICE_TIME', label: 'Meilleur compromis' },
];

export interface DemoComparison {
  readonly corridor: DemoCorridor;
  readonly options: readonly RankableOption[];
  readonly ranking: RankingResult;
  readonly criterion: DemoCriterion;
  /** Valeur du temps (exemple) employée pour « meilleur rapport ». */
  readonly timeValueXofPerMinute: number;
}

/** Construit la comparaison d'un corridor (fictif) en passant par les moteurs réels. */
function compareCorridor(corridor: DemoCorridor, criterion: DemoCriterion): DemoComparison {
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

  const ranking = rankOptions(
    options,
    criterion === 'PRICE_TIME'
      ? { criterion, timeValueXofPerMinute: DEMO_TIME_VALUE_XOF_PER_MIN }
      : { criterion },
  );

  return {
    corridor,
    options,
    ranking,
    criterion,
    timeValueXofPerMinute: DEMO_TIME_VALUE_XOF_PER_MIN,
  };
}

/**
 * Comparaison d'un corridor d'exemple (raccourci). `getComparison(id)` est la
 * couture : une implémentation réelle la remplacera.
 */
export function getComparison(
  corridorId: string,
  criterion: DemoCriterion = 'PRICE_TIME',
): DemoComparison | null {
  const corridor = CORRIDORS.find((c) => c.id === corridorId);
  return corridor ? compareCorridor(corridor, criterion) : null;
}

/* ------------------------------------------------------------------ communes
 * Recherche libre origine → destination (façon Rome2Rio / Citymapper).
 * Les COORDONNÉES sont des faits géographiques publics (communes d'Abidjan).
 * La DISTANCE en est une estimation À VOL D'OISEAU × facteur route, et les
 * prix / durées en découlent : tout cela reste SIMULÉ (aucun OSRM — DEP-001),
 * clairement étiqueté côté interface. Le jour du réel, on remplace ce modèle
 * par des itinéraires calculés — les écrans ne changent pas.
 */
export interface Commune {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
}

export const COMMUNES: readonly Commune[] = [
  { id: 'plateau', name: 'Plateau', lat: 5.32, lng: -4.017 },
  { id: 'cocody', name: 'Cocody', lat: 5.359, lng: -3.983 },
  { id: 'deux-plateaux', name: 'Deux-Plateaux', lat: 5.383, lng: -3.998 },
  { id: 'riviera', name: 'Riviera', lat: 5.362, lng: -3.958 },
  { id: 'angre', name: 'Angré', lat: 5.393, lng: -3.972 },
  { id: 'yopougon', name: 'Yopougon', lat: 5.345, lng: -4.07 },
  { id: 'adjame', name: 'Adjamé', lat: 5.352, lng: -4.028 },
  { id: 'attecoube', name: 'Attécoubé', lat: 5.335, lng: -4.03 },
  { id: 'abobo', name: 'Abobo', lat: 5.418, lng: -4.019 },
  { id: 'treichville', name: 'Treichville', lat: 5.293, lng: -4.01 },
  { id: 'marcory', name: 'Marcory', lat: 5.303, lng: -3.987 },
  { id: 'koumassi', name: 'Koumassi', lat: 5.288, lng: -3.955 },
  { id: 'portbouet', name: 'Port-Bouët', lat: 5.258, lng: -3.93 },
  { id: 'bingerville', name: 'Bingerville', lat: 5.355, lng: -3.885 },
  { id: 'aeroport', name: 'Aéroport FHB', lat: 5.261, lng: -3.926 },
  { id: 'zone4', name: 'Zone 4 (Marcory)', lat: 5.286, lng: -3.996 },
  { id: 'cocody-danga', name: 'Cocody Danga', lat: 5.345, lng: -3.995 },
  { id: 'palmeraie', name: 'Palmeraie', lat: 5.375, lng: -3.945 },
  { id: 'williamsville', name: 'Williamsville', lat: 5.365, lng: -4.021 },
  { id: 'siporex', name: 'Yopougon Siporex', lat: 5.34, lng: -4.086 },
  { id: 'vridi', name: 'Vridi', lat: 5.262, lng: -3.972 },
];

const communeById = new Map(COMMUNES.map((c) => [c.id, c]));

/** Distance à vol d'oiseau (km) entre deux points géographiques. */
function haversineKm(a: Commune, b: Commune): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Facteur route : le trajet réel est plus long que la ligne droite. Estimation. */
const ROAD_FACTOR = 1.35;

/** Distance ROUTE estimée (km, simulée) entre deux communes. `null` si invalide. */
export function pairDistanceKm(fromId: string, toId: string): number | null {
  const a = communeById.get(fromId);
  const b = communeById.get(toId);
  if (!a || !b || a.id === b.id) return null;
  return Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;
}

const SPEED_KMH: Record<DemoMode, number> = { VTC: 24, TAXI: 22, WORO: 15, GBAKA: 13 };
const OVERHEAD_MIN: Record<DemoMode, number> = { VTC: 4, TAXI: 3, WORO: 6, GBAKA: 9 };
const WAIT_MIN: Record<DemoMode, number> = { VTC: 0, TAXI: 0, WORO: 5, GBAKA: 8 };

function durationMinFor(mode: DemoMode, km: number): number {
  return Math.max(5, Math.round((km / SPEED_KMH[mode]) * 60 + OVERHEAD_MIN[mode]));
}

/** Tarif forfaitaire (simulé) des modes partagés, dérivé de la distance. */
function flatFareFor(mode: 'WORO' | 'GBAKA', km: number): number {
  const raw = mode === 'WORO' ? 120 + 22 * km : 80 + 15 * km;
  const step = Math.round(raw / 50) * 50;
  const [lo, hi] = mode === 'WORO' ? [200, 1000] : [150, 800];
  return Math.min(hi, Math.max(lo, step));
}

/** Construit un corridor SIMULÉ pour une paire origine → destination. */
export function buildPairCorridor(fromId: string, toId: string): DemoCorridor | null {
  const a = communeById.get(fromId);
  const b = communeById.get(toId);
  const km = pairDistanceKm(fromId, toId);
  if (!a || !b || km === null) return null;

  const airport = a.id === 'aeroport' || b.id === 'aeroport';
  const meteredFees: readonly FixedFeeSpec[] | undefined = airport
    ? [{ code: 'AIRPORT', label: 'Supplément aéroport (exemple)', amount: 1000 }]
    : undefined;

  const legs: Leg[] = [
    {
      mode: 'VTC',
      providerId: 'op-vtc-demo',
      durationMin: durationMinFor('VTC', km),
      fixedFees: meteredFees,
    },
    {
      mode: 'TAXI',
      providerId: 'op-taxi-demo',
      durationMin: durationMinFor('TAXI', km),
      fixedFees: meteredFees,
    },
    {
      mode: 'WORO',
      providerId: 'op-woro-demo',
      durationMin: durationMinFor('WORO', km),
      waitMin: WAIT_MIN.WORO,
      flatFare: flatFareFor('WORO', km),
    },
    {
      mode: 'GBAKA',
      providerId: 'op-gbaka-demo',
      durationMin: durationMinFor('GBAKA', km),
      waitMin: WAIT_MIN.GBAKA,
      flatFare: flatFareFor('GBAKA', km),
    },
  ];

  return { id: `${a.id}__${b.id}`, from: a.name, to: b.name, km, legs };
}

/** Comparaison d'une paire origine → destination (recherche libre, simulée). */
export function comparePair(
  fromId: string,
  toId: string,
  criterion: DemoCriterion = 'PRICE_TIME',
): DemoComparison | null {
  const corridor = buildPairCorridor(fromId, toId);
  return corridor ? compareCorridor(corridor, criterion) : null;
}
