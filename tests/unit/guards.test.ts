import { describe, it, expect } from 'vitest';
import { hasAtLeast, PUBLIC_ROUTE, AUTHENTICATED_ROUTE, type Role } from '@/guards/types';

describe('hierarchie des roles', () => {
  const roles: Role[] = ['visitor', 'user', 'contributor', 'admin'];

  it('un role couvre tous les roles inferieurs', () => {
    expect(hasAtLeast('admin', 'visitor')).toBe(true);
    expect(hasAtLeast('contributor', 'user')).toBe(true);
    expect(hasAtLeast('user', 'user')).toBe(true);
  });

  it('un role ne couvre aucun role superieur', () => {
    expect(hasAtLeast('visitor', 'user')).toBe(false);
    expect(hasAtLeast('user', 'contributor')).toBe(false);
    expect(hasAtLeast('contributor', 'admin')).toBe(false);
  });

  it('la relation est reflexive pour tous les roles', () => {
    for (const role of roles) expect(hasAtLeast(role, role)).toBe(true);
  });

  it('une route publique est accessible a un visiteur', () => {
    expect(hasAtLeast('visitor', PUBLIC_ROUTE.requires)).toBe(true);
  });

  it('une route authentifiee est refusee a un visiteur et redirige', () => {
    expect(hasAtLeast('visitor', AUTHENTICATED_ROUTE.requires)).toBe(false);
    expect(AUTHENTICATED_ROUTE.redirectTo).toBe('/connexion');
  });
});
