import { describe, expect, it } from 'vitest';
import { validateCandidature } from '@/features/operators/candidature';

/**
 * Candidature d'opérateur : la validation locale refuse ce que la
 * fonction distante refuserait — message clair avant tout envoi.
 */

const valide = {
  nom: 'Coursiers du Plateau',
  mode: 'MOTO' as const,
  contact: 'contact@exemple.ci',
};

describe('validateCandidature', () => {
  it('accepte une candidature complète', () => {
    expect(validateCandidature(valide)).toBeNull();
  });

  it('refuse un nom ou un contact trop courts', () => {
    expect(validateCandidature({ ...valide, nom: 'A' })).toMatch(/nom/i);
    expect(validateCandidature({ ...valide, contact: '123' })).toMatch(/contact/i);
  });

  it('refuse les champs démesurés', () => {
    expect(validateCandidature({ ...valide, nom: 'x'.repeat(121) })).toMatch(/long/i);
    expect(validateCandidature({ ...valide, message: 'x'.repeat(2001) })).toMatch(/long/i);
  });

  it('les champs facultatifs vides ne bloquent pas', () => {
    expect(validateCandidature({ ...valide, referenceAgrement: '', message: '' })).toBeNull();
  });

  it('intégration API : https exigé, longueurs bornées', () => {
    expect(
      validateCandidature({ ...valide, apiDevisUrl: 'https://api.exemple.ci/devis' }),
    ).toBeNull();
    expect(validateCandidature({ ...valide, apiDevisUrl: 'http://api.exemple.ci' })).toMatch(
      /https/,
    );
    expect(validateCandidature({ ...valide, contactTechnique: 'x'.repeat(201) })).toMatch(/long/i);
  });
});
