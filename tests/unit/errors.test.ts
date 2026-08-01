import { describe, it, expect } from 'vitest';
import { AppError, toUserMessage, isRetryable, correlationIdOf } from '@/lib/errors';

describe('AppError', () => {
  it("genere un identifiant de correlation s'il n'est pas fourni", () => {
    const error = new AppError({ kind: 'NETWORK', technicalMessage: 'ECONNRESET' });
    expect(error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("n'expose jamais le message technique a l'usager", () => {
    const error = new AppError({
      kind: 'UNEXPECTED',
      technicalMessage: 'TypeError: cannot read property of undefined at line 42',
    });
    expect(toUserMessage(error)).not.toContain('TypeError');
    expect(toUserMessage(error)).not.toContain('42');
  });

  it('retourne un message neutre pour une erreur inconnue', () => {
    expect(toUserMessage(new Error('boom'))).toBe(
      toUserMessage(
        new AppError({
          kind: 'UNEXPECTED',
          technicalMessage: 'x',
        }),
      ),
    );
  });
});

describe('isRetryable', () => {
  it('autorise le reessai sur reseau, delai et fournisseur', () => {
    for (const kind of ['NETWORK', 'TIMEOUT', 'PROVIDER'] as const) {
      expect(isRetryable(new AppError({ kind, technicalMessage: 'x' }))).toBe(true);
    }
  });

  it('interdit le reessai sur droits, validation et limitation', () => {
    for (const kind of ['UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION', 'RATE_LIMITED'] as const) {
      expect(isRetryable(new AppError({ kind, technicalMessage: 'x' }))).toBe(false);
    }
  });

  it('ne reessaie pas une erreur non typee', () => {
    expect(isRetryable(new Error('boom'))).toBe(false);
    expect(correlationIdOf(new Error('boom'))).toBeNull();
  });
});
