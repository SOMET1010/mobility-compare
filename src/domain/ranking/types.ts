/**
 * CLASSEMENT NATUREL — TYPES
 * =============================================================================
 * INVARIANT I3 — Ce module n'a structurellement AUCUN accès au sponsoring, à
 * la monétisation ou à un quelconque levier commercial. Un test d'architecture
 * fait échouer la CI si un identifiant contenant `sponsor`, `promo`,
 * `discount`, `commission` ou `partnerBoost` apparaît ici.
 *
 * Les badges « moins cher », « plus rapide » et « meilleur rapport prix/temps »
 * sont calculés EXCLUSIVEMENT par ce module. Ils ne peuvent pas être achetés,
 * parce que le code qui les attribue ignore l'existence même d'un annonceur.
 * =============================================================================
 */

import type { Estimation } from '@/domain/result';
import type { FareResult } from '@/domain/pricing/dynamic';

/** Une option de mobilité soumise au classement. */
export interface RankableOption {
  /** Identifiant stable. Sert aussi de clé de départage déterministe. */
  readonly optionId: string;
  readonly providerId: string;
  readonly mode: 'VTC' | 'TAXI' | 'WORO' | 'GBAKA' | 'MOTO' | 'TRICYCLE' | 'CARGO';
  /** Prix estimé, ou absence motivée. */
  readonly fare: Estimation<FareResult>;
  /** Durée de trajet estimée. `null` si indisponible. */
  readonly durationSeconds: number | null;
  /** Attente estimée avant prise en charge. `null` si inconnue. */
  readonly waitSeconds: number | null;
}

export type RankingCriterion = 'PRICE' | 'DURATION' | 'PRICE_TIME';

export interface RankingOptions {
  readonly criterion: RankingCriterion;
  /**
   * Valeur du temps en FCFA par minute, pour le critère PRICE_TIME.
   *
   * Choix délibéré d'une pondération EXPLICITE et interprétable plutôt qu'une
   * normalisation min-max opaque : « à combien valorisez-vous une minute »
   * est une question à laquelle un usager peut répondre. Un score composite
   * sans unité ne serait pas vérifiable, et un classement invérifiable est
   * indistinguable d'un classement biaisé.
   */
  readonly timeValueXofPerMinute?: number;
  /**
   * Score de confiance minimal pour qu'une option soit classée.
   * 0 signifie « aucun filtre ».
   */
  readonly minimumConfidence?: number;
  /** Inclure l'attente dans la durée totale du critère DURATION. */
  readonly includeWaitInDuration?: boolean;
}

export type ExclusionReason = 'NO_FARE' | 'NO_DURATION' | 'BELOW_CONFIDENCE_THRESHOLD';

export interface RankedOption {
  readonly option: RankableOption;
  readonly position: number;
  /** Valeur ayant servi au tri, dans l'unité du critère. */
  readonly sortValue: number;
  /** Formule littérale du score, pour restitution à l'usager. */
  readonly sortExplanation: string;
}

export interface ExcludedOption {
  readonly option: RankableOption;
  readonly reason: ExclusionReason;
  /** Explication destinée à l'usager. */
  readonly explanation: string;
}

export type BadgeCode = 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE';

export interface Badge {
  readonly code: BadgeCode;
  readonly optionId: string;
  readonly justification: string;
}

export interface RankingResult {
  readonly criterion: RankingCriterion;
  /** Options classées, dans l'ordre. */
  readonly ranked: readonly RankedOption[];
  /**
   * Options non classables, AVEC leur raison.
   * Elles ne sont jamais reléguées en fin de classement : les placer en
   * dernier suggérerait qu'elles sont moins bonnes, alors qu'on ne sait
   * simplement pas. C'est l'invariant I1 appliqué au classement.
   */
  readonly excluded: readonly ExcludedOption[];
  readonly badges: readonly Badge[];
  /** Vrai si le classement compte moins de deux options : aucun badge émis. */
  readonly insufficientForBadges: boolean;
}
