import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRODUCT } from '@/config/product';

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
    body: 'Les distances entre quartiers sont désormais les distances routières réelles (matrice OpenStreetMap/OSRM précalculée entre les 29 points de repère). Le calcul à l’adresse exacte attend le serveur de routage auto-hébergé.',
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
    code: 'DEP-009',
    title: 'Trafic en temps réel',
    body: 'Le niveau de circulation affiché est un profil horaire type, simulé. Une source de trafic mesuré le remplacera et ajustera les durées.',
  },
  {
    code: 'DEP-010',
    title: 'Assistant IA',
    body: 'Assistant hybride : réponses guidées locales pour les questions connues, IA serveur sous charte pour les questions libres (aucun prix inventé, neutralité, pas de données personnelles). La clé du fournisseur reste côté serveur.',
  },
];

export default function Method() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <>
      <section className="bg-brand-ink text-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sprout">
            Méthode &amp; transparence
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl sm:leading-tight">
            Comment MOBILIS calcule — et pourquoi on peut le vérifier.
          </h1>
          <p className="mt-4 max-w-2xl text-emph leading-[1.6] text-white/70 sm:text-lg">
            Aucune boîte noire : chaque prix expose sa formule, le classement est neutre par
            construction, et ce qui n’est pas prouvé est signalé comme tel.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-12 sm:space-y-16 sm:py-16">
        {/* Prix */}
        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">Le prix, étape par étape</h2>
          <p className="mt-2 max-w-2xl text-emph leading-[1.6] text-muted-foreground">
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
          <p className="mt-2 max-w-2xl text-emph leading-[1.6] text-muted-foreground">
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

        {/* FAQ — les explications vivent ici, pas dans le parcours de comparaison */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-2xl font-bold sm:text-3xl">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            <details className="group rounded-2xl border bg-card">
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                Qu’est-ce qui est réel, qu’est-ce qui est indicatif ?
              </summary>
              <div className="space-y-3 px-5 pb-5 text-sm text-muted-foreground">
                <p>
                  Le <em>parcours</em> et la <em>mécanique de comparaison</em> sont réels : moteur
                  de classement neutre, trace de calcul de chaque prix (invariant I2), indice de
                  confiance affiché (invariant I1), socle testé en continu. Les <em>valeurs</em>{' '}
                  (distances, prix, durées) restent indicatives tant que les grilles officielles
                  (DEP-002) et les relevés de terrain (DEP-004) ne sont pas branchés.
                </p>
                <p>
                  Du pilote au réel : on remplace la <b>source des données</b> — les écrans et la
                  mécanique ne changent pas.
                </p>
              </div>
            </details>
            <details className="group rounded-2xl border bg-card">
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                Quels modes sont couverts — et ensuite ?
              </summary>
              <div className="space-y-2 px-5 pb-5 text-sm text-muted-foreground">
                <p>
                  <b className="text-foreground">Aujourd’hui :</b> VTC (périmètre prioritaire), taxi
                  compteur, woro-woro, gbaka.
                </p>
                <p>
                  <b className="text-foreground">Demain :</b> bus, BRT, métro, ferry lagunaire,
                  vélo, marche, covoiturage.
                </p>
                <p>
                  <b className="text-foreground">Plus tard :</b> horaires en temps réel,
                  perturbations, empreinte carbone, accessibilité, coût total d’un trajet
                  multimodal.
                </p>
              </div>
            </details>
            <details className="group rounded-2xl border bg-card">
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                Pourquoi certains prix affichent « indice de confiance 0 » ?
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground">
                Aucune donnée n’est inventée : un prix sans observation de terrain s’affiche comme
                non validé plutôt que déguisé en certitude. L’indice monte avec les relevés réels,
                déposés par les usagers et modérés avant publication.
              </div>
            </details>
            <details className="group rounded-2xl border bg-card">
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                Un opérateur peut-il payer pour être mieux classé ?
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground">
                Non, par construction : le moteur de classement n’a aucun accès à un identifiant de
                sponsor, de promotion ou de commission (invariant I3), et une vérification
                automatique bloque toute livraison qui introduirait un tel levier.
              </div>
            </details>
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/40 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">Voyez la méthode à l’œuvre</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Chaque course affiche sa trace de calcul et signale ce qui reste indicatif.
          </p>
          <Link
            to="/comparer"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-ink px-7 py-3 text-base font-semibold text-white transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-110"
          >
            Ouvrir le comparateur →
          </Link>
        </section>
      </div>
    </>
  );
}
