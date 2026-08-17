import { useEffect, type RefObject } from 'react';

/**
 * Comportement commun des dialogues (audit UX A-5) : Escape ferme, le
 * focus reste piégé à l'intérieur (Tab cycle), et revient à l'élément
 * déclencheur à la fermeture. `actif` permet de brancher le hook sur un
 * panneau monté conditionnellement.
 */
export function useDialogue(ref: RefObject<HTMLElement | null>, onClose: () => void, actif = true) {
  useEffect(() => {
    if (!actif) return;
    const el = ref.current;
    const declencheur = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const liste = focusables();
      if (liste.length === 0) return;
      const premier = liste[0]!;
      const dernier = liste[liste.length - 1]!;
      const courant = document.activeElement;
      if (e.shiftKey && (courant === premier || !el?.contains(courant))) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && courant === dernier) {
        e.preventDefault();
        premier.focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      declencheur?.focus?.();
    };
    // Le hook vit et meurt avec le panneau : dépendances volontairement minimales.
  }, [actif]);
}
