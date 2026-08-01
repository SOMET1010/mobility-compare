/**
 * DISJONCTEUR
 * =============================================================================
 * Protege le systeme d'un fournisseur en panne : plutot que d'accumuler des
 * requetes vouees a l'echec, on cesse d'appeler et on retente periodiquement.
 *
 * Trois etats :
 *   CLOSED     nominal, les appels passent
 *   OPEN       apres N echecs consecutifs, PLUS AUCUN appel n'est emis
 *   HALF_OPEN  apres le delai de repos, un appel de sonde est autorise
 *
 * Transitions :
 *   CLOSED    --(N echecs consecutifs)-->  OPEN
 *   OPEN      --(delai de repos ecoule)-->  HALF_OPEN
 *   HALF_OPEN --(sonde reussie)-->          CLOSED
 *   HALF_OPEN --(sonde echouee)-->          OPEN, delai eventuellement rallonge
 *
 * DETERMINISME : l'horloge est injectee. Aucun `Date.now()`, aucun `setTimeout`.
 * Un disjoncteur qui depend du temps reel n'est testable qu'en attendant, donc
 * ne l'est pas.
 * =============================================================================
 */

import type { Clock } from '@/domain/pricing/clock';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitOptions {
  /** Echecs consecutifs avant ouverture. */
  readonly failureThreshold: number;
  /** Duree d'ouverture avant d'autoriser une sonde. */
  readonly cooldownMs: number;
  /**
   * Multiplie le repos a chaque echec de sonde. 1 = repos constant.
   * Evite de harceler un service durablement en panne.
   */
  readonly backoffFactor?: number;
  readonly maxCooldownMs?: number;
}

export interface CircuitSnapshot {
  readonly state: CircuitState;
  readonly consecutiveFailures: number;
  readonly openedAt: Date | null;
  readonly nextProbeAt: Date | null;
  readonly currentCooldownMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt: Date | null = null;
  private currentCooldownMs: number;

  constructor(
    private readonly options: CircuitOptions,
    private readonly clock: Clock,
  ) {
    if (options.failureThreshold < 1) throw new Error('Le seuil doit valoir au moins 1');
    if (options.cooldownMs <= 0) throw new Error('Le delai de repos doit etre positif');
    this.currentCooldownMs = options.cooldownMs;
  }

  /**
   * L'appel est-il autorise ? Effectue au passage la transition
   * OPEN -> HALF_OPEN si le repos est ecoule.
   */
  canAttempt(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      const elapsed = this.clock.now().getTime() - (this.openedAt?.getTime() ?? 0);
      if (elapsed >= this.currentCooldownMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN : une seule sonde a la fois.
    return true;
  }

  onSuccess(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.currentCooldownMs = this.options.cooldownMs;
  }

  onFailure(): void {
    // Un echec de sonde renvoie immediatement en OPEN, sans attendre le seuil.
    if (this.state === 'HALF_OPEN') {
      this.trip(true);
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) this.trip(false);
  }

  private trip(fromProbe: boolean): void {
    if (fromProbe) {
      const factor = this.options.backoffFactor ?? 1;
      const max = this.options.maxCooldownMs ?? Number.POSITIVE_INFINITY;
      this.currentCooldownMs = Math.min(this.currentCooldownMs * factor, max);
    }
    this.state = 'OPEN';
    this.openedAt = this.clock.now();
  }

  snapshot(): CircuitSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      nextProbeAt:
        this.openedAt === null ? null : new Date(this.openedAt.getTime() + this.currentCooldownMs),
      currentCooldownMs: this.currentCooldownMs,
    };
  }

  /** Reinitialisation manuelle, pour l'exploitation. */
  reset(): void {
    this.onSuccess();
  }
}
