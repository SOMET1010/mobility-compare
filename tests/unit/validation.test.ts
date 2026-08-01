import { describe, it, expect } from 'vitest';
import { msisdnSchema, otpCodeSchema } from '@/lib/validation';

describe('normalisation des numeros ivoiriens', () => {
  it.each([
    ['0701020342', '+2250701020342'],
    ['07 01 02 03 42', '+2250701020342'],
    ['07.01.02.03.42', '+2250701020342'],
    ['002250701020342', '+2250701020342'],
    ['+2250701020342', '+2250701020342'],
  ])('normalise %s', (input, expected) => {
    expect(msisdnSchema.parse(input)).toBe(expected);
  });

  it('rejette un numero a 8 chiffres, format anterieur a la migration', () => {
    expect(msisdnSchema.safeParse('01020342').success).toBe(false);
  });

  it('rejette une saisie non numerique', () => {
    expect(msisdnSchema.safeParse('pas-un-numero').success).toBe(false);
  });
});

describe('code OTP', () => {
  it('accepte exactement 6 chiffres', () => {
    expect(otpCodeSchema.parse('123456')).toBe('123456');
  });
  it.each(['12345', '1234567', '12345a', ''])('rejette %s', (input) => {
    expect(otpCodeSchema.safeParse(input).success).toBe(false);
  });
});
