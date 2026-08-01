import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redact, maskMsisdn, Logger, type LogEntry } from '@/modules/logger';

describe('maskMsisdn', () => {
  it("conserve l'indicatif et les deux derniers chiffres", () => {
    expect(maskMsisdn('+2250701020342')).toBe('+225 ** ** ** 42');
  });
  it('tolere un numero mal formate sans lever', () => {
    expect(maskMsisdn('07')).toBe('***');
  });
});

describe('redact — aucune donnee sensible ne sort en clair', () => {
  it('masque le code OTP', () => {
    expect(redact({ otp: '123456' })).toEqual({ otp: '[masque]' });
  });

  it('masque un mot de passe, un jeton et une cle', () => {
    const output = redact({ password: 'p', token: 't', apiKey: 'k' }) as Record<string, unknown>;
    expect(Object.values(output)).toEqual(['[masque]', '[masque]', '[masque]']);
  });

  it('masque le numero tout en le gardant correlable', () => {
    expect(redact({ phoneNumber: '+2250701020342' })).toEqual({
      phoneNumber: '+225 ** ** ** 42',
    });
  });

  it('masque les coordonnees GPS', () => {
    expect(redact({ lat: 5.35, lng: -4.02 })).toEqual({ lat: '[masque]', lng: '[masque]' });
  });

  it('descend dans les objets imbriques', () => {
    const output = redact({ user: { profile: { otp: '999999', city: 'Abidjan' } } });
    expect(output).toEqual({ user: { profile: { otp: '[masque]', city: 'Abidjan' } } });
  });

  it('traite les tableaux', () => {
    expect(redact([{ otp: '1' }, { otp: '2' }])).toEqual([
      { otp: '[masque]' },
      { otp: '[masque]' },
    ]);
  });

  it('laisse passer les donnees non sensibles', () => {
    expect(redact({ component: 'SearchForm', durationMs: 42 })).toEqual({
      component: 'SearchForm',
      durationMs: 42,
    });
  });

  it('ne boucle pas sur une structure circulaire profonde', () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 20; i += 1) {
      cursor['next'] = {};
      cursor = cursor['next'] as Record<string, unknown>;
    }
    expect(() => redact(deep)).not.toThrow();
  });
});

describe('Logger', () => {
  beforeEach(() => Logger.reset());

  it('transmet au collecteur un contexte deja masque', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = Logger.getInstance();
    logger.setSink(sink);
    logger.error('Echec envoi', { msisdn: '+2250701020342', otp: '123456' });

    expect(sink).toHaveBeenCalledOnce();
    const entry = sink.mock.calls[0]![0];
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('123456');
    expect(serialized).not.toContain('0701020342');
  });

  it('fusionne le contexte de base', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = Logger.getInstance();
    logger.setContext({ component: 'App' });
    logger.setSink(sink);
    logger.error('Erreur');
    expect(sink.mock.calls[0]![0].context['component']).toBe('App');
  });
});
