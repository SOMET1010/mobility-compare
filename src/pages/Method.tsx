import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { Wordmark } from '@/components/BrandMark';
import { SiteHeader } from '@/components/SiteHeader';

/**
 * Page Méthode & transparence — la référence « comment on calcule ».
 * Concrète et vérifiable : décrit le modèle de prix, le classement neutre, les
 * garde-fous d'honnêteté et les dépendances encore ouvertes. Aucun chiffre
 * d'adoption ou partenaire inventé.
 */

const FARE_STEPS: { k: string; v: string }[] = [
  { k: 'Prise en charge', v: 'Un montant de base au départ (modes au compteur).' },
  { k: 'Distance', v: 'Tarif au kilomètre × distance du trajet.' },
  { k: 'Temps', v: 'Tarif à la minute × durée estimée.' },
  { k: 'Frais fixes', v: 'Suppléments explicites (ex. aéroport, péage) listés séparément.' },
  { k: 'Plancher & arrondi', v: 'Tarif minimum garanti, puis arrondi à un pas fixe.' },
];

const OPEN_DEPS: { code: string; title: string; body: string }[] = [
  {
    code: 'DEP-001',
    title: 'Routage réel (OSRM)',
    body: 'Aujourd’hui la distance est estimée à vol d’oiseau × facteur route. Le calcul par les rues remplacera cette estimation.',
  },
  {
    code: 'DEP-002',
    title: 'Grilles tarifaires officielles',
    body: 'Les tarifs affichés sont des exemples. Une grille officielle datée les rendra vérifiables.',
  },
  {
    code: 'DEP-003',
    title: 'Assiette de la taxe',
    body: 'La politique fiscale reste non tranchée : deux options sont implémentées et testées, en attente d’arbitrage.',
  },
  {
    code: 'DEP-004',
    title: 'Relevés de terrain',
    body: 'Sans observation réelle, l’indice de confiance reste à 0. Les relevés le feront monter.',
  },
  {
    code: 'DEP-008',
    title: 'Trafic en temps réel',
    body: 'Le niveau de circulation affiché est un profil horaire type, simulé. Une source de trafic mesuré le remplacera et ajustera les durées.',
  },
  {
    code: 'DEP-009',
    title: 'Assistant IA',
    body: 'L’assistant actuel est guidé : réponses préécrites, calculées sur l’appareil. Un assistant IA serveur exigera un hébergement et une charte d’usage.',
  },
];

export default function Method() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/', label: 'Accueil' },
          { to: '/partenaires', label: 'Partenaires' },
        ]}
      />

      <section className="bg-[var(--brand-ink)] text-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C3D18F]">
            Méthode &amp; transparence
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl sm:leading-tight">
            Comment MOBILIS calcule — et pourquoi on peut le vérifier.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.6] text-white/70 sm:text-lg">
            Aucune boîte noire : chaque prix expose sa formule, le classement est neutre par
            construction, et ce qui n’est pas prouvé est signalé comme tel.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-12 sm:space-y-16 sm:py-16">
        {/* Prix */}
        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">Le prix, étape par étape</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-[1.6] text-muted-foreground">
            Chaque course produit une <b>trace de calcul</b> (invariant I2) : la démonstration
            l’affiche en clair, ligne par ligne.
          </p>
          <dl className="mt-5 divide-y rounded-2xl border bg-card">
            {FARE_STEPS.map((s) => (
              <div
                key={s.k}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="w-48 shrink-0 font-semibold text-primary">{s.k}</dt>
                <dd className="text-sm text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Classement */}
        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">Le classement est neutre</h2>
          <div className="mt-5 grid gap-3 sm:gap-5 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Trois critères, au choix de l’usager</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Moins cher, plus rapide, ou meilleur compromis (prix + valeur du temps). C’est
                l’usager qui décide de la priorité — pas un opérateur.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Aucun levier commercial (invariant I3)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Le moteur de classement n’a aucun accès à un identifiant de sponsor, de promotion ou
                de commission. Une vérification automatique bloque la publication si un tel levier
                apparaît.
              </p>
            </div>
          </div>
        </section>

        {/* Honnêteté */}
        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">L’honnêteté des données</h2>
          <div className="mt-5 grid gap-3 sm:gap-5 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Indice de confiance</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sans observation de terrain, un tarif s’affiche comme non validé (confiance 0)
                plutôt que comme une certitude.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Absence honnête (invariant I1)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Quand une donnée manque, {PRODUCT.displayName} le dit. Pas d’estimation déguisée.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Estimations étiquetées</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Distances simulées, empreinte carbone indicative : toujours marquées comme
                estimations, jamais comme mesures.
              </p>
            </div>
          </div>
        </section>

        {/* Dépendances */}
        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">Ce qu’il reste à brancher</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-[1.6] text-muted-foreground">
            La démonstration tourne sur des données simulées. Voici, honnêtement, ce qui la rendra
            réelle.
          </p>
          <div className="mt-5 space-y-3">
            {OPEN_DEPS.map((d) => (
              <div
                key={d.code}
                className="flex flex-col gap-1 rounded-xl border bg-card p-4 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="w-24 shrink-0 font-mono text-xs font-bold text-primary">
                  {d.code}
                </span>
                <div>
                  <div className="font-semibold">{d.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/40 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">Voyez la méthode à l’œuvre</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            La démonstration affiche la trace de calcul de chaque course et signale ce qui est
            simulé.
          </p>
          <Link
            to="/demo"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--brand-ink)] px-7 py-3 text-base font-semibold text-white transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-110"
          >
            Ouvrir la démonstration →
          </Link>
        </section>
      </div>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-10 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" />
          <p>
            {PRODUCT.scope.city}, {PRODUCT.scope.countryName} · Identité, nom et hébergement
            provisoires · Démonstration à données simulées.
          </p>
        </div>
      </footer>
    </div>
  );
}
