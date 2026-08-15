/**
 * Compte de DÉMONSTRATION — simulation locale, honnête.
 *
 * Aucun backend n'est configuré et le Sender ID SMS n'est pas attribué
 * (ADR-001) : aucun SMS réel ne peut être envoyé, aucune donnée ne peut être
 * enregistrée côté serveur. Ce module simule donc le parcours d'inscription
 * ENTIÈREMENT sur l'appareil : le code « OTP » est AFFICHÉ à l'écran (jamais
 * présenté comme envoyé), et le profil vit dans le stockage local du
 * navigateur, supprimable à tout moment. L'UI l'affiche sans ambiguïté.
 */

export interface SimAccount {
  /** Numéro normalisé +225XXXXXXXXXX (validé par msisdnSchema). */
  readonly msisdn: string;
  /** Date ISO de création de la simulation. */
  readonly createdAt: string;
}

export const SIM_ACCOUNT_KEY = 'mobilis.sim-account.v1';
export const ONBOARDING_KEY = 'mobilis.onboarding.v1';

export const ACCOUNT_DISCLAIMER =
  'Inscription de démonstration : aucun SMS réel (Sender ID en attente — ADR-001), aucun serveur (backend non configuré). Tout reste sur votre appareil.';

/** Plus grand multiple de 10 représentable sur 32 bits — rejet du biais modulo. */
const UNBIASED_MAX = 2 ** 32 - (2 ** 32 % 10);

function cryptoUint32(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/**
 * Code à 6 chiffres pour la simulation — généré sans biais (rejet modulo),
 * comme l'exige le moteur OTP du CDC (§M6). Source d'aléa injectable pour
 * les tests ; par défaut, `crypto.getRandomValues`.
 */
export function generateSimOtp(nextUint32: () => number = cryptoUint32): string {
  let code = '';
  while (code.length < 6) {
    const v = nextUint32();
    if (v < UNBIASED_MAX) code += v % 10;
  }
  return code;
}

/** Masque un numéro pour l'affichage : +225 07 •• •• •• 89. */
export function maskMsisdn(msisdn: string): string {
  const m = /^\+225(\d{2})(\d{6})(\d{2})$/.exec(msisdn);
  return m ? `+225 ${m[1]} •• •• •• ${m[3]}` : msisdn;
}

export function loadSimAccount(storage: Pick<Storage, 'getItem'>): SimAccount | null {
  try {
    const raw = storage.getItem(SIM_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SimAccount>;
    if (typeof parsed.msisdn !== 'string' || typeof parsed.createdAt !== 'string') return null;
    return { msisdn: parsed.msisdn, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function saveSimAccount(storage: Pick<Storage, 'setItem'>, account: SimAccount): void {
  storage.setItem(SIM_ACCOUNT_KEY, JSON.stringify(account));
}

export function clearSimAccount(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(SIM_ACCOUNT_KEY);
}

/* ----------------------------------------------------------- onboarding */

export function hasSeenOnboarding(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(ONBOARDING_KEY) === 'done';
  } catch {
    return true; // stockage indisponible → ne pas bloquer l'accès
  }
}

export function markOnboardingSeen(storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(ONBOARDING_KEY, 'done');
  } catch {
    /* stockage indisponible : tant pis, l'onboarding réapparaîtra */
  }
}
