import { env } from '@/config/env';

/**
 * Balise d'audience souveraine — une seule information part : « une page de
 * la liste blanche a été affichée » (+ « c'est la première de la session »).
 * Ni cookie, ni identifiant, ni position : impossible de suivre une personne,
 * par construction. Les navigateurs qui demandent à ne pas être suivis
 * (Do Not Track / Global Privacy Control) ne sont pas comptés du tout.
 */

/** Pages comptées — miroir de la liste blanche serveur. /moderation exclue. */
const PAGES = new Set([
  '/',
  '/comparer',
  '/observatoire',
  '/methode',
  '/partenaires',
  '/compte',
  '/conditions',
]);

/** Marqueur de session (efface-toi tout seul à la fermeture de l'onglet). */
const SESSION_FLAG = 'mobilis.visite.v1';

function refuseTracking(): boolean {
  if (typeof navigator === 'undefined') return true;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack === '1' || n.globalPrivacyControl === true;
}

/** Signale l'affichage d'une page. Silencieux et sans conséquence en échec. */
export function trackPage(path: string): void {
  if (!env.VITE_SUPABASE_URL) return;
  if (refuseTracking()) return;
  const page = path === '/demo' ? '/comparer' : path;
  if (!PAGES.has(page)) return;
  let visite = false;
  try {
    if (!window.sessionStorage.getItem(SESSION_FLAG)) {
      window.sessionStorage.setItem(SESSION_FLAG, '1');
      visite = true;
    }
  } catch {
    // Stockage indisponible (navigation privée stricte) : on compte une vue simple.
  }
  void fetch(`${env.VITE_SUPABASE_URL}/functions/v1/audience`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ page, visite }),
    keepalive: true,
  }).catch(() => undefined);
}
