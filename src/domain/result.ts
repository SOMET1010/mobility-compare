/**
 * INVARIANT I1 — ABSENCE HONNETE
 * Un moteur d'estimation ne retourne JAMAIS un nombre par defaut.
 * Soit il a une valeur calculee et tracable, soit il declare une absence
 * motivee. Il n'existe pas de repli silencieux, pas de moyenne de secours.
 *
 * Le typage rend la violation impossible sans le voir : on ne peut pas lire
 * `.value` sans avoir teste `available`.
 */

export type AbsenceReason =
  | 'NO_PRICING_MODEL'
  | 'INSUFFICIENT_OBSERVATIONS'
  | 'OUT_OF_COVERAGE'
  | 'ROUTING_FAILED'
  | 'PROVIDER_INACTIVE'
  | 'NETWORK_NOT_MAPPED';

export interface Available<T> {
  readonly available: true;
  readonly value: T;
  /** INVARIANT I2 : toute valeur affichee doit pouvoir etre expliquee. */
  readonly trace: CalculationTrace;
}

export interface Absent {
  readonly available: false;
  readonly reason: AbsenceReason;
}

export type Estimation<T> = Available<T> | Absent;

export interface CalculationTrace {
  readonly pricingModelVersion: string | null;
  readonly routingProvider: string | null;
  readonly distanceMeters: number | null;
  readonly durationSeconds: number | null;
  readonly observationCount: number;
  readonly oldestObservationAt: Date | null;
  readonly confidenceScore: number;
}
