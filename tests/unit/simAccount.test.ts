import { describe, expect, it } from 'vitest';
import {
  clearSimAccount,
  generateSimOtp,
  hasSeenOnboarding,
  loadSimAccount,
  markOnboardingSeen,
  maskMsisdn,
  saveSimAccount,
} from '@/features/account/simAccount';

/** Stockage en mémoire, pour tester sans navigateur. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

describe('compte simulé — stockage local honnête', () => {
  it('sauvegarde puis recharge un profil', () => {
    const s = fakeStorage();
    saveSimAccount(s, { msisdn: '+2250700000089', createdAt: '2026-08-15T10:00:00.000Z' });
    expect(loadSimAccount(s)).toEqual({
      msisdn: '+2250700000089',
      createdAt: '2026-08-15T10:00:00.000Z',
    });
  });

  it('rend null quand rien n’est stocké ou que le contenu est corrompu', () => {
    const s = fakeStorage();
    expect(loadSimAccount(s)).toBeNull();
    s.setItem('mobilis.sim-account.v1', '{pas du json');
    expect(loadSimAccount(s)).toBeNull();
    s.setItem('mobilis.sim-account.v1', JSON.stringify({ msisdn: 42 }));
    expect(loadSimAccount(s)).toBeNull();
  });

  it('supprime le profil (droit à l’effacement local)', () => {
    const s = fakeStorage();
    saveSimAccount(s, { msisdn: '+2250700000089', createdAt: '2026-08-15T10:00:00.000Z' });
    clearSimAccount(s);
    expect(loadSimAccount(s)).toBeNull();
  });
});

describe('compte simulé — code à 6 chiffres (sans biais)', () => {
  it('génère exactement 6 chiffres', () => {
    expect(generateSimOtp()).toMatch(/^\d{6}$/);
  });

  it('est déterministe à source injectée (testabilité)', () => {
    let i = 0;
    const seq = [1, 2, 3, 4, 5, 6];
    const next = () => seq[i++ % seq.length]!;
    expect(generateSimOtp(next)).toBe('123456');
  });

  it('rejette les tirages au-dessus du seuil anti-biais', () => {
    // 2^32 - 1 n'est pas multiple de 10 : ce tirage doit être rejeté,
    // puis les suivants acceptés.
    const seq = [2 ** 32 - 1, 10, 21, 32, 43, 54, 65];
    let i = 0;
    const next = () => seq[i++]!;
    expect(generateSimOtp(next)).toBe('012345');
  });
});

describe('compte simulé — masquage du numéro', () => {
  it('masque le cœur du numéro, garde préfixe et fin', () => {
    expect(maskMsisdn('+2250700000089')).toBe('+225 07 •• •• •• 89');
  });

  it('laisse intact un format inattendu plutôt que d’inventer', () => {
    expect(maskMsisdn('+33612345678')).toBe('+33612345678');
  });
});

describe('onboarding — drapeau de première visite', () => {
  it('non vu par défaut, vu après marquage', () => {
    const s = fakeStorage();
    expect(hasSeenOnboarding(s)).toBe(false);
    markOnboardingSeen(s);
    expect(hasSeenOnboarding(s)).toBe(true);
  });

  it('ne bloque pas si le stockage jette (navigation privée)', () => {
    const broken = {
      getItem: () => {
        throw new Error('quota');
      },
    };
    expect(hasSeenOnboarding(broken)).toBe(true);
  });
});
