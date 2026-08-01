/**
 * GRILLE TARIFAIRE DYNAMIQUE — MODELE ET VALIDATION
 * =============================================================================
 * Couvre les tarifications VTC et taxi compteur.
 *
 * Aucune valeur numerique n'est fournie ici. Les grilles reelles seront
 * collectees (CDC §7) puis versionnees en base. Ce fichier definit la FORME
 * d'une grille et les conditions de sa validite, rien de plus.
 *
 * INTERDIT PAR CONCEPTION : aucun coefficient commercial, promotionnel ou
 * pilote par un partenaire n'existe dans ce modele. Un test d'architecture le
 * verifie en continu. Un comparateur dont le prix affiche depend d'un accord
 * commercial n'est plus un comparateur.
 * =============================================================================
 */

import { z } from 'zod';

/** Entier positif ou nul, en XOF. */
const amount = z.number().int().nonnegative();

/** Multiplicateur : 1 signifie « aucune majoration ». */
const multiplier = z.number().min(1);

/**
 * Fenetre horaire locale (Abidjan, UTC+0).
 * `fromHour` inclus, `toHour` exclu. Une fenetre qui franchit minuit
 * (22h → 5h) est exprimee avec `fromHour > toHour` et traitee comme telle.
 */
export const timeWindowSchema = z
  .object({
    label: z.string().min(1),
    fromHour: z.number().int().min(0).max(23),
    toHour: z.number().int().min(0).max(24),
    /** Jours concernes, 0 = dimanche. Vide signifie « tous les jours ». */
    weekdays: z.array(z.number().int().min(0).max(6)).default([]),
    multiplier,
  })
  .refine((w) => w.fromHour !== w.toHour, {
    message: 'Une fenetre horaire de duree nulle ou totale est ambigue',
  });

export const zoneSurchargeSchema = z.object({
  zoneId: z.string().min(1),
  label: z.string().min(1),
  multiplier,
});

export const fixedFeeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  amount,
});

export const fareGridSchema = z
  .object({
    /** Identifiant de l'operateur. Aucun nom commercial en dur. */
    providerId: z.string().min(1),
    /** Version de grille. Deux calculs identiques exigent la meme version. */
    version: z.string().min(1),
    currency: z.literal('XOF'),

    /** Prise en charge, due des le depart. */
    pickupFee: amount,
    perKilometer: amount,
    perMinute: amount,
    /** Attente a l'arret, facturee a la minute. */
    perWaitingMinute: amount.default(0),
    /** Plancher applique au sous-total. Voir HYPOTHESE H1. */
    minimumFare: amount,

    timeWindows: z.array(timeWindowSchema).default([]),
    zoneSurcharges: z.array(zoneSurchargeSchema).default([]),
    /** Frais fixes non majorables : peages, supplement aeroport... H2. */
    fixedFees: z.array(fixedFeeSchema).default([]),

    /**
     * Plafond du multiplicateur total. Garde-fou explicite contre une
     * majoration non bornee — la tarification dynamique fait l'objet d'un
     * recadrage annonce par la DGTTC (CDC §2).
     */
    maxTotalMultiplier: z.number().min(1).default(3),

    /** Taxe sur le prix de la course. 0.04 = 4 %. Voir HYPOTHESE H5. */
    taxRate: z.number().min(0).max(1).default(0),

    roundingStep: z.number().int().positive().default(5),
    roundingMode: z.enum(['nearest', 'up', 'down']).default('nearest'),

    /** Bornes de validite de la grille. */
    validFrom: z.date(),
    validTo: z.date().nullable().default(null),
  })
  .refine((grid) => grid.validTo === null || grid.validTo > grid.validFrom, {
    message: 'La fin de validite doit suivre le debut',
  })
  .refine((grid) => grid.perKilometer > 0 || grid.perMinute > 0 || grid.pickupFee > 0, {
    message: 'Une grille sans aucune composante tarifaire produirait un prix nul',
  })
  .refine(
    (grid) => {
      const codes = grid.fixedFees.map((fee) => fee.code);
      return new Set(codes).size === codes.length;
    },
    { message: 'Deux frais fixes portent le meme code' },
  )
  .refine(
    (grid) => {
      const zones = grid.zoneSurcharges.map((zone) => zone.zoneId);
      return new Set(zones).size === zones.length;
    },
    { message: 'Deux majorations visent la meme zone' },
  );

export type FareGrid = z.infer<typeof fareGridSchema>;
export type TimeWindow = z.infer<typeof timeWindowSchema>;

export type GridValidation =
  | { readonly valid: true; readonly grid: FareGrid }
  | { readonly valid: false; readonly errors: readonly string[] };

/**
 * Valide une grille AVANT tout calcul.
 * Le moteur n'accepte qu'une grille validee : il est impossible de lui
 * transmettre une configuration incoherente.
 */
export function validateFareGrid(input: unknown): GridValidation {
  const parsed = fareGridSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'grille'} : ${issue.message}`,
      ),
    };
  }
  return { valid: true, grid: parsed.data };
}

/** Une fenetre horaire couvre-t-elle cet instant ? Gere le passage de minuit. */
export function windowCovers(window: TimeWindow, hour: number, weekday: number): boolean {
  if (window.weekdays.length > 0 && !window.weekdays.includes(weekday)) return false;
  const crossesMidnight = window.fromHour > window.toHour;
  return crossesMidnight
    ? hour >= window.fromHour || hour < window.toHour
    : hour >= window.fromHour && hour < window.toHour;
}
