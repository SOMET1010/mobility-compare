/**
 * PRIMITIVES DE VALIDATION
 * Origine : NOLI `src/lib/zod-schemas.ts`. Les schemas metier (devis, police,
 * garantie, souscription) sont ECARTES. Seules les primitives reutilisables
 * sont reprises, adaptees au contexte ivoirien.
 */

import { z } from 'zod';

/**
 * Numero ivoirien au format E.164.
 * La Cote d'Ivoire utilise 10 chiffres apres l'indicatif +225.
 * Voir SPEC_Module_OTP_SMS §6 pour la normalisation complete.
 */
export const msisdnSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.\-()]/g, ''))
  .transform((value) => (value.startsWith('00225') ? `+${value.slice(2)}` : value))
  .transform((value) => (/^\d{10}$/.test(value) ? `+225${value}` : value))
  .refine((value) => /^\+225\d{10}$/.test(value), {
    message: 'Numero ivoirien attendu, au format +225 suivi de 10 chiffres',
  });

/** Code OTP a 6 chiffres. Longueur definie dans SPEC_Module_OTP_SMS §4.2. */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'Le code doit comporter 6 chiffres' });

/** Coordonnee geographique. Bornes mondiales : le filtrage sur Abidjan est metier. */
export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Montant en francs CFA : entier positif, la devise n'a pas de subdivision usuelle. */
export const amountXofSchema = z.number().int().nonnegative();

export type Msisdn = z.infer<typeof msisdnSchema>;
export type GeoPoint = z.infer<typeof geoPointSchema>;
