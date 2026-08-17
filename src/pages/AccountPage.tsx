import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/SiteHeader';
import { msisdnSchema, otpCodeSchema } from '@/lib/validation';
import {
  ACCOUNT_DISCLAIMER,
  clearSimAccount,
  generateSimOtp,
  loadSimAccount,
  maskMsisdn,
  saveSimAccount,
  type SimAccount,
} from '@/features/account/simAccount';

/**
 * Compte — parcours d'inscription par téléphone (+225) avec code à 6 chiffres.
 *
 * SIMULATION assumée : sans backend ni Sender ID (ADR-001), aucun SMS réel
 * n'est envoyé — le code est affiché à l'écran, et le « profil » vit dans le
 * stockage local de l'appareil. Le parcours (saisie, validation E.164, code,
 * consentement CGU) est le vrai parcours prévu pour la production.
 */

type Step = 'phone' | 'otp';

export default function AccountPage() {
  const [account, setAccount] = useState<SimAccount | null>(() =>
    typeof window === 'undefined' ? null : loadSimAccount(window.localStorage),
  );
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [msisdn, setMsisdn] = useState<string | null>(null);
  const [expectedCode, setExpectedCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  function submitPhone() {
    const parsed = msisdnSchema.safeParse(phoneInput);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? 'Numéro invalide');
      return;
    }
    if (!consent) {
      setPhoneError('Veuillez accepter les conditions d’utilisation pour continuer.');
      return;
    }
    setPhoneError(null);
    setMsisdn(parsed.data);
    setExpectedCode(generateSimOtp());
    setCodeInput('');
    setCodeError(null);
    setStep('otp');
  }

  function submitCode() {
    const parsed = otpCodeSchema.safeParse(codeInput);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message ?? 'Code invalide');
      return;
    }
    if (parsed.data !== expectedCode) {
      setCodeError('Code incorrect — recopiez le code affiché dans l’encadré.');
      return;
    }
    const created: SimAccount = { msisdn: msisdn!, createdAt: new Date().toISOString() };
    saveSimAccount(window.localStorage, created);
    setAccount(created);
    setStep('phone');
    toast.success('Profil de démonstration créé', {
      description: 'Il n’existe que sur cet appareil et peut être supprimé à tout moment.',
    });
  }

  function deleteAccount() {
    clearSimAccount(window.localStorage);
    setAccount(null);
    setStep('phone');
    setPhoneInput('');
    setConsent(false);
    toast('Profil supprimé', { description: 'Le stockage local a été effacé.' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/', label: 'Accueil' },
          { to: '/methode', label: 'Méthode' },
        ]}
      />

      <main className="mx-auto w-full max-w-md px-5 py-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Compte
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {account ? 'Votre profil de démonstration' : 'Créer un profil'}
        </h1>

        {/* Bandeau d'honnêteté */}
        <div className="mt-4 rounded-xl border border-[#B9722A]/40 bg-[#B9722A]/8 px-3.5 py-2.5 text-[12px] font-medium leading-snug text-[#26301C]">
          {ACCOUNT_DISCLAIMER}
        </div>

        {account ? (
          /* ---------------------------------------------------- profil */
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Téléphone
              </div>
              <div className="mt-1 text-lg font-extrabold tabular-nums">
                {maskMsisdn(account.msisdn)}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Profil créé le
              </div>
              <div className="mt-1 text-sm font-semibold">
                {new Date(account.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
                Stocké uniquement sur cet appareil (aucun serveur). Dans le produit final, ce profil
                portera vos trajets favoris et vos contributions tarifaires.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={deleteAccount}>
              Supprimer ce profil (effacement local)
            </Button>
            <Link
              to="/comparer"
              className="block text-center text-sm font-semibold text-primary hover:underline"
            >
              Aller au comparateur →
            </Link>
          </div>
        ) : step === 'phone' ? (
          /* ------------------------------------------------- téléphone */
          <div className="mt-5">
            <label
              htmlFor="phone"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Numéro de téléphone ivoirien
            </label>
            <input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className="w-full rounded-xl border bg-background px-3.5 py-3 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-snug">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#5C6B2E]"
              />
              <span>
                J’ai lu et j’accepte les{' '}
                <Link to="/conditions" className="font-semibold text-primary underline">
                  conditions d’utilisation
                </Link>{' '}
                (version provisoire).
              </span>
            </label>
            {phoneError && (
              <p className="mt-2 text-[12px] font-medium text-[#9A3412]" role="alert">
                {phoneError}
              </p>
            )}
            <Button className="mt-4 h-12 w-full text-base" onClick={submitPhone}>
              Recevoir le code (simulation) →
            </Button>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              En production : un SMS avec un code à 6 chiffres, envoyé via un Sender ID officiel
              (multi-opérateurs Orange/MTN/Moov). Ici, le code sera affiché à l’écran.
            </p>
          </div>
        ) : (
          /* ------------------------------------------------------ code */
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">
              Numéro saisi : <b className="tabular-nums text-foreground">{msisdn}</b>
            </p>

            {/* Le code est AFFICHÉ — pas de faux « SMS envoyé ». */}
            <div className="mt-3 rounded-xl border border-dashed bg-muted/50 p-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Votre code (simulation — aucun SMS réel n’est envoyé)
              </div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums tracking-[0.3em]">
                {expectedCode}
              </div>
            </div>

            <label
              htmlFor="otp"
              className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Recopiez le code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="••••••"
              className="w-full rounded-xl border bg-background px-3.5 py-3 text-center text-xl font-bold tabular-nums tracking-[0.3em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {codeError && (
              <p className="mt-2 text-[12px] font-medium text-[#9A3412]" role="alert">
                {codeError}
              </p>
            )}
            <Button className="mt-4 h-12 w-full text-base" onClick={submitCode}>
              Valider →
            </Button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="mt-3 w-full text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ← Changer de numéro
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
