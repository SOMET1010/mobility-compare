import { useEffect, useState } from 'react';

/**
 * Bandeau hors-ligne — pertinent en 2G/3G à Abidjan (audit externe F2).
 * Absence honnête inversée : quand le réseau manque, on le DIT, plutôt
 * que de laisser des écrans muets ou des données d'âge inconnu.
 */
export function HorsLigneBanner() {
  const [enLigne, setEnLigne] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );
  useEffect(() => {
    const on = () => setEnLigne(true);
    const off = () => setEnLigne(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (enLigne) return null;
  return (
    <div
      role="status"
      className="apparait border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-center text-label font-bold text-warn"
    >
      Hors ligne — les données affichées peuvent être anciennes.
    </div>
  );
}
