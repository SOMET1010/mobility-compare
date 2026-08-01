import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasAtLeast, type Role, type RouteAccess } from './types';
import { logger } from '@/modules/logger';

interface Props {
  readonly access: RouteAccess;
  readonly currentRole: Role;
  readonly isResolving?: boolean;
  readonly children: ReactNode;
}

/**
 * Origine : fusion simplifiee de NOLI AuthGuard + RoleGuard.
 * NOLI utilisait deux composants imbriques aux responsabilites qui se
 * recouvraient. Un seul suffit : la hierarchie de roles couvre les deux cas.
 */
export function RouteGuard({ access, currentRole, isResolving = false, children }: Props) {
  // Tant que le role n'est pas connu, on ne redirige pas : cela provoquerait
  // une deconnexion apparente a chaque rechargement de page.
  if (isResolving) return null;

  if (!hasAtLeast(currentRole, access.requires)) {
    logger.info('Acces refuse a une route protegee', {
      component: 'RouteGuard',
      required: access.requires,
    });
    return <Navigate to={access.redirectTo} replace />;
  }

  return <>{children}</>;
}
