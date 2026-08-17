import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { Wordmark } from '@/components/BrandMark';
import { IS_BACKEND_CONFIGURED } from '@/config/env';

/**
 * LE pied de page du site — un seul, partout (audit UX C1 : il existait en
 * cinq exemplaires divergents et manquait sur trois pages). L'honnêteté en
 * pastilles courtes : état du backend, statut pilote, liens de référence.
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Wordmark className="text-base" testId />
        <div className="flex flex-wrap items-center gap-2 text-label text-muted-foreground">
          {/* Alerte d'état honnête : visible uniquement quand le backend manque. */}
          {!IS_BACKEND_CONFIGURED && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              Backend non configure
            </span>
          )}
          <span className="rounded-full border px-2.5 py-1 font-medium">Version pilote</span>
          <span className="rounded-full border px-2.5 py-1 font-medium">Prix indicatifs</span>
          <Link
            to="/methode"
            className="rounded-full border px-2.5 py-1 font-medium underline-offset-2 transition hover:text-foreground hover:underline"
          >
            Notre méthode
          </Link>
          <Link
            to="/conditions"
            className="rounded-full border px-2.5 py-1 font-medium underline-offset-2 transition hover:text-foreground hover:underline"
          >
            Conditions d'utilisation
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 text-label leading-relaxed text-muted-foreground">
        {PRODUCT.displayName} — {PRODUCT.scope.city}, {PRODUCT.scope.countryName}. Identité visuelle
        et hébergement provisoires.
      </div>
    </footer>
  );
}
