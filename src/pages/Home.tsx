import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { Button } from '@/components/ui/button';

/**
 * Vitrine produit — MOBILIS.
 * Présente la proposition de valeur (comparateur NEUTRE de mobilités) et mène au
 * parcours de démonstration. Reste honnête : la démo est explicitement une
 * simulation à données 100 % fictives (aucun prix / durée / itinéraire réel).
 */

/** Marque provisoire « Voies qui convergent » (variante A). */
function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <line x1="24" y1="4" x2="24" y2="17" />
        <line x1="41.3" y1="14" x2="30.5" y2="20.5" />
        <line x1="41.3" y1="34" x2="30.5" y2="27.5" />
        <line x1="24" y1="44" x2="24" y2="31" />
        <line x1="6.7" y1="34" x2="17.5" y2="27.5" />
        <line x1="6.7" y1="14" x2="17.5" y2="20.5" />
      </g>
      <circle cx="24" cy="24" r="4.2" fill="#E8920A" />
    </svg>
  );
}

const VALUE_PROPS: { title: string; body: string }[] = [
  {
    title: 'Neutre par conception',
    body: 'Aucun opérateur n’achète sa place. Le classement ne connaît ni sponsor ni commission — c’est un invariant du code, pas une promesse.',
  },
  {
    title: 'Tous les modes, côte à côte',
    body: 'VTC, taxi compteur, woro-woro et gbaka comparés sur le même trajet : prix, durée, et le meilleur compromis.',
  },
  {
    title: 'Transparent',
    body: 'Chaque prix affiche son calcul, étape par étape. Quand une donnée manque, on le dit — pas d’estimation déguisée.',
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-12">
      {/* Hero */}
      <header className="flex flex-col items-center gap-4 text-center">
        <Mark className="h-14 w-14 text-foreground" />
        <div>
          <h1 data-testid="product-name" className="text-4xl font-extrabold tracking-tight">
            {PRODUCT.displayName}
          </h1>
          {PRODUCT.tagline && (
            <p className="mt-2 text-base text-muted-foreground">{PRODUCT.tagline}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {PRODUCT.scope.city}, {PRODUCT.scope.countryName} · VTC · taxi compteur · woro-woro ·
          gbaka
        </p>
      </header>

      {/* Proposition de valeur */}
      <section className="flex flex-col gap-3">
        {VALUE_PROPS.map((v) => (
          <div key={v.title} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
              <h2 className="font-semibold">{v.title}</h2>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
          </div>
        ))}
      </section>

      {/* Appel à l'action */}
      <section className="flex flex-col gap-2">
        <Button asChild size="lg" className="w-full text-base">
          <Link to="/demo">Comparer un trajet →</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Démonstration interactive à données 100 % fictives — aucun prix, durée ou itinéraire réel.
        </p>
      </section>

      {/* Note d'honnêteté */}
      <footer className="mt-auto flex flex-col items-center gap-2 border-t pt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              IS_BACKEND_CONFIGURED ? 'bg-primary' : 'bg-muted-foreground'
            }`}
          />
          {IS_BACKEND_CONFIGURED ? 'Backend configure' : 'Backend non configure'}
        </span>
        <p>
          Identité visuelle et hébergement <strong>provisoires</strong>. Données de démonstration
          simulées. Le moteur de tarification et le classement sont réels ; ils attendent leurs
          sources de terrain avant toute mise en production.
        </p>
      </footer>
    </main>
  );
}
