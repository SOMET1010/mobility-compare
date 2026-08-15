import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';

/**
 * Vitrine produit — MOBILIS.
 * Registre « plateforme d'intérêt public ». La crédibilité vient du design, du
 * positionnement et de la clarté — jamais de chiffres, partenaires ou avis
 * inventés. La démo reste explicitement une simulation à données 100 % fictives.
 */

/* ------------------------------------------------------------------ marque */

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

function Wordmark({ className = '', testId = false }: { className?: string; testId?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}
      {...(testId ? { 'data-testid': 'product-name' } : {})}
    >
      <Mark className="h-[0.9em] w-[0.9em]" />
      {PRODUCT.displayName}
    </span>
  );
}

/* --------------------------------------------------------------- contenu */

const PILLARS: { value: string; label: string }[] = [
  { value: '4', label: 'modes comparés sur un même trajet' },
  { value: '0', label: 'sponsor, promo ou commission dans le classement' },
  { value: '100 %', label: 'du calcul de prix visible, étape par étape' },
];

const MODES: { icon: GlyphShape; name: string; note: string }[] = [
  { icon: 'vtc', name: 'VTC', note: 'Réservé, porte-à-porte' },
  { icon: 'taxi', name: 'Taxi compteur', note: 'Direct, au compteur' },
  { icon: 'woro', name: 'Woro-woro', note: 'Partagé, tarif fixe' },
  { icon: 'gbaka', name: 'Gbaka', note: 'Minibus, ligne fixe' },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '1',
    title: 'Choisissez votre trajet',
    body: 'Un point de départ, une destination dans l’agglomération d’Abidjan.',
  },
  {
    n: '2',
    title: 'Comparez les modes',
    body: 'Prix, durée et meilleur compromis, tous les modes côte à côte, classés selon votre priorité.',
  },
  {
    n: '3',
    title: 'Vérifiez le calcul',
    body: 'Chaque tarif s’ouvre sur son détail : base, distance, temps, suppléments. Rien n’est caché.',
  },
];

const ROADMAP: { tag: string; title: string; body: string; done?: boolean }[] = [
  {
    tag: 'Aujourd’hui',
    title: 'Abidjan — démonstration',
    body: 'Le parcours complet et les moteurs de calcul, sur un échantillon de corridors.',
    done: true,
  },
  {
    tag: 'Ensuite',
    title: 'Données réelles',
    body: 'Itinéraires calculés, grilles officielles et relevés de terrain remplacent la simulation.',
  },
  {
    tag: 'Demain',
    title: 'Échelle nationale',
    body: 'Extension aux villes de Côte d’Ivoire, puis aux bus, BRT, ferry lagunaire, vélo et marche.',
  },
];

/* ------------------------------------------------------------------ page */

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1518]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 text-white">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/70 sm:inline">
              Démonstration
            </span>
            <Link
              to="/demo"
              className="rounded-lg bg-[#E8920A] px-3.5 py-2 text-sm font-semibold text-[#0B1518] transition hover:brightness-105"
            >
              Voir la démo
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0B1518] text-white">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#35BDBE]">
            Côte d’Ivoire · Mobilité urbaine
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Comparez tous vos trajets urbains.
            <br />
            <span className="text-white/60">En toute neutralité.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {PRODUCT.displayName} met le VTC, le taxi compteur, le woro-woro et le gbaka sur un même
            écran — prix, temps et meilleur compromis. À Abidjan aujourd’hui, en Côte d’Ivoire
            demain.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/demo"
              className="inline-flex items-center justify-center rounded-xl bg-[#E8920A] px-6 py-3.5 text-base font-semibold text-[#0B1518] shadow-lg shadow-black/20 transition hover:brightness-105"
            >
              Voir la démonstration →
            </Link>
            <a
              href="#comment"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-base font-semibold text-white/90 transition hover:bg-white/5"
            >
              Comment ça marche
            </a>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E8920A]" />
            Aperçu de démonstration — données 100 % simulées, aucun prix ou itinéraire réel.
          </p>
        </div>

        {/* Bandeau piliers (faits réels sur le produit, pas des statistiques inventées) */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PILLARS.map((p) => (
              <div key={p.label} className="px-5 py-6">
                <div className="text-3xl font-extrabold text-white">{p.value}</div>
                <div className="mt-1 text-sm text-white/60">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLÈME / RÉPONSE */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Le problème
            </h2>
            <p className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
              À Abidjan, choisir son mode de transport se fait à l’aveugle.
            </p>
            <p className="mt-4 text-muted-foreground">
              VTC, taxi compteur, woro-woro, gbaka : des prix qui ne se comparent pas, des temps
              qu’on découvre en route, et chaque acteur qui défend son offre. Aucun repère neutre
              pour trancher.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              La réponse
            </h2>
            <p className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
              Un comparateur neutre, d’intérêt public.
            </p>
            <p className="mt-4 text-muted-foreground">
              {PRODUCT.displayName} met tous les modes à plat sur le même trajet et affiche le
              calcul en clair. Il ne vend pas de courses : il aide à décider. Sa neutralité est une
              règle du système, pas un argument.
            </p>
          </div>
        </div>
      </section>

      {/* MODES */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl font-bold sm:text-3xl">Les modes couverts</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Les mobilités réelles d’Abidjan, comparées ensemble — pas seulement les applications.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {MODES.map((m) => (
              <div key={m.name} className="rounded-2xl border bg-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F8B8D]/12 text-[#0F8B8D]">
                  <ModeGlyph shape={m.icon} className="h-7 w-7" />
                </div>
                <div className="mt-4 font-semibold">{m.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-16 sm:py-24">
        <h2 className="text-2xl font-bold sm:text-3xl">Comment ça marche</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border bg-card p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8920A] text-sm font-bold text-[#0B1518]">
                {s.n}
              </div>
              <div className="mt-4 font-semibold">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEUTRALITÉ */}
      <section className="bg-[#0E1B1F] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr,1.2fr] md:items-center md:gap-16">
            <div>
              <Mark className="h-12 w-12 text-white" />
              <h2 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
                La neutralité n’est pas une promesse. C’est une règle du code.
              </h2>
            </div>
            <div className="space-y-5 text-white/75">
              <p>
                Le classement n’a <strong className="text-white">aucun accès</strong> à un
                identifiant de sponsor, de promotion ou de commission. Un opérateur ne peut pas
                acheter sa place — la structure même du système l’interdit.
              </p>
              <p>
                Ce n’est pas déclaratif : une vérification automatique bloque la publication si un
                tel levier commercial est introduit dans le moteur de classement. La neutralité est
                testée à chaque livraison.
              </p>
              <p>
                Et quand une donnée manque, {PRODUCT.displayName} le dit — plutôt que d’afficher une
                estimation déguisée en certitude.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEUILLE DE ROUTE */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <h2 className="text-2xl font-bold sm:text-3xl">L’ambition</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Une plateforme pensée pour l’échelle nationale, livrée par étapes honnêtes.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {ROADMAP.map((r) => (
            <div key={r.title} className="rounded-2xl border bg-card p-6">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  r.done ? 'bg-[#0F8B8D]/15 text-[#0F8B8D]' : 'bg-muted text-muted-foreground'
                }`}
              >
                {r.tag}
              </span>
              <div className="mt-4 font-semibold">{r.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-bold sm:text-3xl">Voyez la comparaison en action</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Un parcours complet, de la recherche au détail du calcul. Sur des données de
            démonstration, en attendant les sources réelles.
          </p>
          <Link
            to="/demo"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#0E1B1F] px-7 py-3.5 text-base font-semibold text-white transition hover:brightness-125"
          >
            Comparer un trajet →
          </Link>
        </div>
      </section>

      {/* PIED — honnêteté */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" testId />
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  IS_BACKEND_CONFIGURED ? 'bg-[#0F8B8D]' : 'bg-muted-foreground'
                }`}
              />
              {IS_BACKEND_CONFIGURED ? 'Backend configure' : 'Backend non configure'}
            </span>
            <span className="rounded-full border px-2.5 py-1 font-medium">Identité provisoire</span>
            <span className="rounded-full border px-2.5 py-1 font-medium">Données simulées</span>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-10 text-[11px] leading-relaxed text-muted-foreground">
          {PRODUCT.displayName} — {PRODUCT.scope.city}, {PRODUCT.scope.countryName}. La
          démonstration présente des données 100 % fictives ; le moteur de tarification et le
          classement sont réels et attendent leurs sources de terrain avant toute mise en
          production. Nom, identité visuelle et hébergement sont provisoires.
        </div>
      </footer>
    </div>
  );
}

/* Fond du hero : réseau de voies qui convergent (identité), abstrait. */
function HeroBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13]"
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8920A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="#35BDBE" strokeWidth="1.4" fill="none">
        <path d="M120 40 L560 250" />
        <path d="M40 200 L560 250" />
        <path d="M80 420 L560 250" />
        <path d="M320 470 L560 250" />
        <path d="M760 60 L560 250" />
        <path d="M780 300 L560 250" />
        <path d="M700 440 L560 250" />
        <path d="M440 20 L560 250" />
      </g>
      <g fill="#35BDBE">
        {[
          [120, 40],
          [40, 200],
          [80, 420],
          [320, 470],
          [760, 60],
          [780, 300],
          [700, 440],
          [440, 20],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" />
        ))}
      </g>
      <circle cx="560" cy="250" r="60" fill="url(#hub)" />
      <circle cx="560" cy="250" r="7" fill="#E8920A" />
    </svg>
  );
}
