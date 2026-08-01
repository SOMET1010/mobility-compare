/**
 * HORLOGE INJECTEE
 * Le moteur ne lit JAMAIS l'heure systeme. Une regle horaire dependant de
 * `new Date()` est intestable : son resultat change selon le moment ou le test
 * s'execute, et un bug de majoration nocturne ne se reproduit qu'a 22 h.
 *
 * FUSEAU : la Cote d'Ivoire est a UTC+00:00 toute l'annee, sans heure d'ete.
 * L'heure UTC est donc l'heure locale d'Abidjan. Cette equivalence est posee
 * ici explicitement plutot que supposee ailleurs dans le code.
 */

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Horloge deterministe, pour les tests et les rejeux. */
export function fixedClock(instant: Date): Clock {
  return { now: () => new Date(instant.getTime()) };
}

/** Heure locale d'Abidjan (0-23) pour un instant donne. */
export function abidjanHour(instant: Date): number {
  return instant.getUTCHours();
}

/** Jour de la semaine a Abidjan : 0 = dimanche. */
export function abidjanWeekday(instant: Date): number {
  return instant.getUTCDay();
}
