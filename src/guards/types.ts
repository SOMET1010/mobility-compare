/**
 * CONVENTIONS DE ROUTES
 * Origine : derive de NOLI `src/guards/AuthGuard.tsx` et `RoleGuard.tsx`.
 * Ecarte : les roles metier NOLI (assureur, souscripteur, gestionnaire) et
 * toute reference au domaine assurance.
 *
 * Les roles ci-dessous sont ceux du comparateur de mobilite. La liste est
 * volontairement courte : on n'anticipe pas des roles dont le besoin n'est pas
 * demontre.
 */

export type Role = 'visitor' | 'user' | 'contributor' | 'admin';

/** Hierarchie : un role donne acces a tout ce qui est en dessous. */
const ROLE_RANK: Record<Role, number> = {
  visitor: 0,
  user: 1,
  contributor: 2,
  admin: 3,
};

export function hasAtLeast(current: Role, required: Role): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}

export interface RouteAccess {
  /** Role minimal requis. `visitor` signifie route publique. */
  readonly requires: Role;
  /** Route de repli si l'acces est refuse. */
  readonly redirectTo: string;
}

export const PUBLIC_ROUTE: RouteAccess = { requires: 'visitor', redirectTo: '/' };
export const AUTHENTICATED_ROUTE: RouteAccess = { requires: 'user', redirectTo: '/connexion' };
