/**
 * MOTEUR DE CALCUL TARIFAIRE DYNAMIQUE
 * =============================================================================
 * Domaine pur : aucun acces reseau, aucun acces base, aucune horloge systeme.
 * Entree = donnees explicites. Sortie = `Estimation<FareResult>`.
 *
 * INVARIANTS APPLIQUES
 *   I1  Absence honnete — aucune valeur par defaut, aucun repli silencieux.
 *       Une entree insuffisante produit `Absent(raison)`, jamais un prix.
 *   I2  Tracabilite — chaque resultat porte le detail de son calcul.
 *   I3  Aucun coefficient commercial n'existe dans ce moteur.
 *
 * ORDRE D'APPLICATION (fige, cf. HYPOTHESES H1-H6 dans le document
 * d'hypotheses tarifaires) :
 *
 *   S1 = priseEnCharge + (prixKm x km) + (prixMin x min) + (prixAttente x attente)
 *   S2 = S1 x M          M = min(majorationHoraire x majorationZone, plafond)
 *   S3 = max(S2, minimumDeCourse)
 *   S4 = S3 + fraisFixes
 *   S5 = S4 x (1 + taxe)
 *   S6 = arrondi(S5)
 *
 * Cet ordre n'est pas neutre : il est documente, teste, et devra etre confirme
 * par relevés terrain. Voir HYPOTHESES.
 * =============================================================================
 */

import type { Estimation, TraceStep } from '@/domain/result';
import { roundTo, xof, type Xof } from '../money';
import { abidjanHour, abidjanWeekday, type Clock } from '../clock';
import { windowCovers, type FareBasis, type FareGrid, type PolicyStatus } from './grid';

/** Trajet mesure, tel que fourni par la couche de routage. */
export interface TripMeasurement {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  /** Attente a l'arret, en secondes. Facultative. */
  readonly waitingSeconds?: number;
  /** Zones traversees ouvrant droit a majoration geographique. */
  readonly zoneIds?: readonly string[];
  /** Fournisseur de routage, conserve pour la trace. */
  readonly routingProvider: string;
}

/** Detail du plafonnement, expose meme lorsqu'il ne joue pas. */
export interface MultiplierOutcome {
  /** Majoration issue de la composition, avant tout ecretage. */
  readonly raw: number;
  /** Majoration effectivement retenue. */
  readonly applied: number;
  readonly capped: boolean;
  /** Raison de l'ecretage, `null` si non plafonne. */
  readonly capReason: string | null;
  /** Mode de composition employe et son statut de validation. */
  readonly compositionMode: 'MULTIPLICATIVE' | 'MAX';
  readonly compositionStatus: PolicyStatus;
}

export interface FareResult {
  readonly amount: Xof;
  readonly currency: 'XOF';
  readonly gridVersion: string;
  readonly providerId: string;
  /**
   * Base de l'estimation. Une valeur REGULATORY et une valeur OBSERVED ne
   * doivent jamais etre fusionnees : elles n'ont pas le meme statut.
   */
  readonly basis: FareBasis;
  readonly multiplier: MultiplierOutcome;
  /** Vrai si le plancher a pris le pas sur le calcul au compteur. */
  readonly minimumApplied: boolean;
  /** Politiques appliquees et leur statut, pour lecture par l'appelant. */
  readonly policiesApplied: {
    readonly multiplierComposition: PolicyStatus;
    readonly taxBase: PolicyStatus;
  };
}

export interface FareInput {
  readonly grid: FareGrid;
  readonly trip: TripMeasurement;
  /** Instant de reference. A defaut, l'horloge injectee fait foi. */
  readonly departureAt?: Date;
}

/**
 * Calcule un prix estime.
 * `clock` est injectee : le moteur ne lit jamais l'heure systeme.
 */
export function computeFare(input: FareInput, clock: Clock): Estimation<FareResult> {
  const { grid, trip } = input;

  // --- Garde-fous d'entree : I1 ---------------------------------------------
  if (!Number.isFinite(trip.distanceMeters) || trip.distanceMeters < 0) {
    return { available: false, reason: 'ROUTING_FAILED' };
  }
  if (!Number.isFinite(trip.durationSeconds) || trip.durationSeconds < 0) {
    return { available: false, reason: 'ROUTING_FAILED' };
  }

  const at = input.departureAt ?? clock.now();
  if (Number.isNaN(at.getTime())) {
    return { available: false, reason: 'ROUTING_FAILED' };
  }

  // Une grille hors periode de validite ne donne pas lieu a extrapolation.
  if (at < grid.validFrom || (grid.validTo !== null && at >= grid.validTo)) {
    return { available: false, reason: 'NO_PRICING_MODEL' };
  }

  const steps: TraceStep[] = [];
  const kilometers = trip.distanceMeters / 1000;
  const minutes = trip.durationSeconds / 60;
  const waitingMinutes = (trip.waitingSeconds ?? 0) / 60;

  // --- S1 : sous-total variable ---------------------------------------------
  const distancePart = grid.perKilometer * kilometers;
  const durationPart = grid.perMinute * minutes;
  const waitingPart = grid.perWaitingMinute * waitingMinutes;
  const s1 = grid.pickupFee + distancePart + durationPart + waitingPart;

  steps.push({
    label: 'Prise en charge',
    formula: `${grid.pickupFee} FCFA`,
    amount: grid.pickupFee,
  });
  steps.push({
    label: 'Distance',
    formula: `${grid.perKilometer} FCFA/km x ${kilometers.toFixed(2)} km`,
    amount: Math.round(distancePart),
  });
  steps.push({
    label: 'Duree',
    formula: `${grid.perMinute} FCFA/min x ${minutes.toFixed(1)} min`,
    amount: Math.round(durationPart),
  });
  if (waitingMinutes > 0) {
    steps.push({
      label: 'Attente',
      formula: `${grid.perWaitingMinute} FCFA/min x ${waitingMinutes.toFixed(1)} min`,
      amount: Math.round(waitingPart),
    });
  }

  // --- S2 : majorations ------------------------------------------------------
  const hour = abidjanHour(at);
  const weekday = abidjanWeekday(at);

  const activeWindow = grid.timeWindows.find((w) => windowCovers(w, hour, weekday));
  const timeMultiplier = activeWindow?.multiplier ?? 1;

  const tripZones = trip.zoneIds ?? [];
  const activeZones = grid.zoneSurcharges.filter((z) => tripZones.includes(z.zoneId));

  // La composition est une POLITIQUE portee par la grille (H3), pas une
  // constante du moteur. Aucun mode n'est confirme par releve terrain.
  const compositionMode = grid.policies.multiplierComposition.mode;
  const zoneMultipliers = activeZones.map((z) => z.multiplier);
  const rawMultiplier =
    compositionMode === 'MAX'
      ? Math.max(timeMultiplier, ...zoneMultipliers, 1)
      : zoneMultipliers.reduce((acc, m) => acc * m, timeMultiplier);

  const capped = rawMultiplier > grid.maxTotalMultiplier;
  const appliedMultiplier = capped ? grid.maxTotalMultiplier : rawMultiplier;

  const multiplier: MultiplierOutcome = {
    raw: rawMultiplier,
    applied: appliedMultiplier,
    capped,
    capReason: capped
      ? `Borne technique provisoire x${grid.maxTotalMultiplier} : aucune source reglementaire versee au dossier`
      : null,
    compositionMode,
    compositionStatus: grid.policies.multiplierComposition.status,
  };

  const s2 = s1 * appliedMultiplier;

  if (appliedMultiplier !== 1 || capped) {
    const causes = [
      activeWindow ? `${activeWindow.label} x${timeMultiplier}` : null,
      ...activeZones.map((z) => `${z.label} x${z.multiplier}`),
    ].filter(Boolean);
    const modeLabel = compositionMode === 'MAX' ? 'max' : 'produit';
    steps.push({
      label: 'Majoration',
      formula:
        `${causes.join(' + ')} (${modeLabel}) = brute x${rawMultiplier.toFixed(2)}` +
        (capped ? `, retenue x${appliedMultiplier.toFixed(2)} — ${multiplier.capReason}` : ''),
      amount: Math.round(s2),
    });
  }

  // --- S3 : minimum de course (H1) -------------------------------------------
  const minimumApplied = s2 < grid.minimumFare;
  const s3 = Math.max(s2, grid.minimumFare);
  if (minimumApplied) {
    steps.push({
      label: 'Minimum de course',
      formula: `${Math.round(s2)} FCFA < ${grid.minimumFare} FCFA`,
      amount: grid.minimumFare,
    });
  }

  // --- S4 : frais fixes, non majorables (H2) ---------------------------------
  const fixedTotal = grid.fixedFees.reduce((acc, fee) => acc + fee.amount, 0);
  const s4 = s3 + fixedTotal;
  for (const fee of grid.fixedFees) {
    steps.push({ label: fee.label, formula: `${fee.amount} FCFA`, amount: fee.amount });
  }

  // --- S5 : taxe, assiette selon la politique de la grille (H5) --------------
  const taxMode = grid.policies.taxBase.mode;
  const taxableBase = taxMode === 'METER_ONLY' ? s3 : s4;
  const taxAmount = taxableBase * grid.taxRate;
  const s5 = s4 + taxAmount;
  if (grid.taxRate > 0) {
    const baseLabel =
      taxMode === 'METER_ONLY' ? 'compteur seul, hors frais fixes' : 'total avant taxe';
    steps.push({
      label: 'Taxe',
      formula: `${(grid.taxRate * 100).toFixed(1)} % de ${Math.round(taxableBase)} FCFA (${baseLabel})`,
      amount: Math.round(s5),
    });
  }

  // --- S6 : arrondi (H6) -----------------------------------------------------
  const total = roundTo(s5, grid.roundingStep, grid.roundingMode);
  steps.push({
    label: 'Total',
    formula: `arrondi au multiple de ${grid.roundingStep} FCFA (${grid.roundingMode})`,
    amount: total,
  });

  return {
    available: true,
    value: {
      amount: total,
      currency: 'XOF',
      gridVersion: grid.version,
      providerId: grid.providerId,
      basis: grid.basis,
      multiplier,
      minimumApplied,
      policiesApplied: {
        multiplierComposition: grid.policies.multiplierComposition.status,
        taxBase: grid.policies.taxBase.status,
      },
    },
    trace: {
      steps,
      pricingModelVersion: grid.version,
      routingProvider: trip.routingProvider,
      distanceMeters: trip.distanceMeters,
      durationSeconds: trip.durationSeconds,
      // Le moteur dynamique ne s'appuie sur aucune observation terrain :
      // la confiance viendra du recalage par contributions (module a venir).
      observationCount: 0,
      oldestObservationAt: null,
      confidenceScore: 0,
    },
  };
}

export { xof };
