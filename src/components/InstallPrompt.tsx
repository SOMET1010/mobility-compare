import { useEffect, useState } from 'react';

/**
 * Invite d'installation PWA (« Ajouter à l'écran d'accueil »).
 * L'événement `beforeinstallprompt` (Chrome/Android — le parc dominant à
 * Abidjan) est capturé au chargement du module, avant que ce composant ne soit
 * monté ; l'invite ne s'affiche qu'aux moments choisis par les écrans (après
 * une comparaison réussie), jamais en interstitiel bloquant.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mobilis.install.v1';

let deferred: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    subscribers.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subscribers.forEach((fn) => fn());
  });
}

export function InstallPrompt() {
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) !== null,
  );

  useEffect(() => {
    const refresh = () => force((n) => n + 1);
    subscribers.add(refresh);
    return () => {
      subscribers.delete(refresh);
    };
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    const evt = deferred;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    deferred = null;
    window.localStorage.setItem(DISMISS_KEY, 'prompted');
    setHidden(true);
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, 'dismissed');
    setHidden(true);
  }

  return (
    <div className="mt-4 flex items-center gap-3 apparait rounded-2xl border bg-card p-3.5">
      <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold leading-tight">
          Ajoutez MOBILIS à votre écran d’accueil
        </div>
        <div className="text-label text-muted-foreground">
          Gratuit, léger, et vos trajets restent sous la main.
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg px-2 py-2 text-note font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Plus tard
      </button>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-xl bg-brand-ink px-3.5 py-2 text-note font-semibold text-white transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink active:brightness-110"
      >
        Installer
      </button>
    </div>
  );
}
