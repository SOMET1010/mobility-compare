import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/BrandMark';

/**
 * Barre supérieure commune à TOUTES les pages — l'unique système d'en-tête du
 * site (audit UI/UX, constat n°4). Compacte, liens secondaires repliés en
 * burger sous 640 px, resserrée au scroll.
 *
 * - `cta`   : bouton toujours visible ; « Voir la démo » par défaut, `null`
 *             pour le masquer (sur la démo elle-même).
 * - `banner`: bande collante rendue sous la barre — le bandeau d'honnêteté de
 *             la démo, par exemple.
 */
export function SiteHeader({
  links,
  cta = { to: '/demo', label: 'Voir la démo' },
  banner,
}: {
  links: { to: string; label: string }[];
  cta?: { to: string; label: string } | null;
  banner?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/10 bg-[#26301C]/90 backdrop-blur transition-shadow duration-200 ${
        scrolled ? 'shadow-lg shadow-black/10' : ''
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 text-white transition-[padding] duration-200 sm:px-5 ${
          scrolled ? 'py-1.5 sm:py-2' : 'py-2.5 sm:py-3'
        }`}
      >
        <Link
          to="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Wordmark className="text-base sm:text-lg" />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hidden rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white sm:block"
            >
              {l.label}
            </Link>
          ))}
          {cta && (
            <Link
              to={cta.to}
              className="rounded-lg bg-[#B9722A] px-3 py-2 font-semibold text-[#26301C] transition hover:brightness-105 sm:px-3.5"
            >
              {cta.label}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </nav>
      </div>
      {menuOpen && (
        <div id="menu-mobile" className="border-t border-white/10 px-4 pb-3 pt-1 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
      {banner}
    </header>
  );
}
