import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import { BrandMark, Wordmark } from '@/components/BrandMark';

/**
 * Vitrine produit — MOBILIS.
 * Registre « plateforme d'intérêt public ». La crédibilité vient du design, du
 * positionnement et de la clarté — jamais de chiffres, partenaires ou avis
 * inventés. La démo reste explicitement une simulation à données 100 % fictives.
 */

/* --------------------------------------------------------------- contenu */

/**
 * Photo de hero (libre de droits, optimisée < 250 Ko). Reste `null` tant
 * qu'aucune image n'est déposée : le visuel de repli (dégradé + skyline
 * stylisée) évite tout 404. Pour l'activer : déposer `public/hero-abidjan.webp`
 * puis mettre `HERO_IMAGE = '/hero-abidjan.webp'`.
 */
const HERO_IMAGE: string | null = null;

/** Accents multicolores des stats (comme la maquette), accordés à la palette. */
type StatIcon = 'route' | 'shield' | 'eye' | 'people';
const STATS: { value: string; label: string; icon: StatIcon; tint: string }[] = [
  { value: '4', label: 'modes comparés sur un même trajet', icon: 'route', tint: '#5C6B2E' },
  {
    value: '0',
    label: 'sponsor, promo ou commission dans le classement',
    icon: 'shield',
    tint: '#B9722A',
  },
  {
    value: '100 %',
    label: 'du calcul de prix visible, étape par étape',
    icon: 'eye',
    tint: '#3F8F8B',
  },
  {
    value: 'Neutre',
    label: 'méthodologie équitable et transparente',
    icon: 'people',
    tint: '#7C6BA8',
  },
];

const STAT_ICONS: Record<StatIcon, JSX.Element> = {
  route: (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h6a3 3 0 0 0 3-3V8M6 17V9a3 3 0 0 1 3-3h5" />
    </svg>
  ),
  shield: (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  eye: (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  people: (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 3.5a3 3 0 0 1 0 5.8M21 20c0-2.5-1.5-4.7-3.7-5.6" />
    </svg>
  ),
};

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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#26301C]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 text-white">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link
              to="/methode"
              className="hidden rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white sm:block"
            >
              Méthode
            </Link>
            <Link
              to="/partenaires"
              className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Partenaires
            </Link>
            <Link
              to="/demo"
              className="rounded-lg bg-[#B9722A] px-3.5 py-2 font-semibold text-[#26301C] transition hover:brightness-105"
            >
              Voir la démo
            </Link>
          </div>
        </div>
      </header>

      {/* HERO (clair, composition inspirée de la maquette) */}
      <section className="relative overflow-hidden border-b bg-background">
        {/* Desktop : visuel pleine hauteur à droite, fondu vers le crème */}
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[58%] lg:block">
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent, #000 42%)',
                maskImage: 'linear-gradient(to right, transparent, #000 42%)',
              }}
            >
              <HeroPhoto />
            </div>
            <ConvergingModes />
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20 lg:py-28">
          <div className="lg:max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {PRODUCT.scope.countryName} · Mobilité urbaine
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Comparez tous vos trajets urbains. <span className="text-primary">En toute</span>{' '}
              <span className="text-[#B9722A]">neutralité.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              {PRODUCT.displayName} met le VTC, le taxi compteur, le woro-woro et le gbaka sur un
              même écran — prix, temps et meilleur compromis. À Abidjan aujourd’hui, en Côte
              d’Ivoire demain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/demo"
                className="inline-flex items-center justify-center rounded-xl bg-[#B9722A] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#B9722A]/20 transition hover:brightness-105"
              >
                Voir la démonstration →
              </Link>
              <a
                href="#comment"
                className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background/60 px-6 py-3.5 text-base font-semibold backdrop-blur transition hover:bg-muted"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Comment ça marche
              </a>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Aperçu de démonstration — données 100 % simulées, aucun prix ou itinéraire réel.
            </p>

            {/* Mobile : bande visuelle */}
            <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-3xl border shadow-lg lg:hidden">
              <HeroPhoto />
              <ConvergingModes />
              <span className="absolute bottom-2 right-3 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-medium text-white/90">
                Visuel provisoire
              </span>
            </div>
          </div>
        </div>

        {/* Barre de stats (faits réels sur le produit) */}
        <div className="border-t">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-5 py-6">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${s.tint} 16%, transparent)`,
                    color: s.tint,
                  }}
                >
                  {STAT_ICONS[s.icon]}
                </span>
                <div>
                  <div className="text-2xl font-extrabold leading-none">{s.value}</div>
                  <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {s.label}
                  </div>
                </div>
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5C6B2E]/12 text-[#5C6B2E]">
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B9722A] text-sm font-bold text-[#26301C]">
                {s.n}
              </div>
              <div className="mt-4 font-semibold">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEUTRALITÉ */}
      <section className="bg-[#26301C] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr,1.2fr] md:items-center md:gap-16">
            <div>
              <BrandMark className="h-12 w-12 text-white" />
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
                  r.done ? 'bg-[#5C6B2E]/15 text-[#5C6B2E]' : 'bg-muted text-muted-foreground'
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
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#26301C] px-7 py-3.5 text-base font-semibold text-white transition hover:brightness-125"
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
                  IS_BACKEND_CONFIGURED ? 'bg-[#5C6B2E]' : 'bg-muted-foreground'
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

/** Repli visuel : coucher de soleil + skyline / pont / lagune stylisés (léger, CDC 3G). */
function Skyline() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A3A46" />
          <stop offset="55%" stopColor="#C98A3C" />
          <stop offset="100%" stopColor="#E3B872" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E6E70" />
          <stop offset="100%" stopColor="#1D4E52" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="300" fill="url(#sky)" />
      <circle cx="300" cy="90" r="26" fill="#F4E3B0" opacity="0.85" />
      <g fill="#26301C" opacity="0.92">
        <rect x="20" y="150" width="22" height="60" />
        <rect x="48" y="130" width="16" height="80" />
        <rect x="70" y="160" width="26" height="50" />
        <rect x="104" y="120" width="18" height="90" />
        <rect x="128" y="145" width="20" height="65" />
        <path d="M300 210 V120 l10 -14 l10 14 V210 z" />
        <rect x="330" y="150" width="18" height="60" />
        <rect x="354" y="135" width="22" height="75" />
      </g>
      <g stroke="#26301C" strokeWidth="2" opacity="0.85" fill="none">
        <path d="M170 210 L210 150 L250 210" />
        <path
          d="M210 150 L182 205 M210 150 L196 205 M210 150 L224 205 M210 150 L238 205"
          strokeWidth="1"
        />
      </g>
      <rect x="0" y="210" width="400" height="90" fill="url(#water)" />
      <g stroke="#5FA6A4" strokeWidth="1.2" opacity="0.5">
        <line x1="30" y1="235" x2="120" y2="235" />
        <line x1="60" y1="255" x2="180" y2="255" />
        <line x1="240" y1="245" x2="360" y2="245" />
      </g>
    </svg>
  );
}

/** Photo réelle si fournie (remplit le conteneur), sinon le repli stylisé. */
function HeroPhoto() {
  return HERO_IMAGE ? (
    <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <Skyline />
  );
}

/**
 * « Voies qui convergent » posées sur le visuel : les pastilles de mode sont
 * reliées par des courbes vers un point de décision central (identité, variante A).
 */
function ConvergingModes() {
  const hub = { x: 62, y: 50 };
  const nodes: { shape: GlyphShape; x: number; y: number; tint: string }[] = [
    { shape: 'vtc', x: 24, y: 20, tint: '#B9722A' },
    { shape: 'gbaka', x: 52, y: 12, tint: '#5C6B2E' },
    { shape: 'taxi', x: 82, y: 22, tint: '#B9722A' },
    { shape: 'woro', x: 22, y: 66, tint: '#5C6B2E' },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {nodes.map((n) => (
          <path
            key={n.shape}
            d={`M ${n.x} ${n.y} C ${(n.x + hub.x) / 2} ${n.y} ${(n.x + hub.x) / 2} ${hub.y} ${hub.x} ${hub.y}`}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
      >
        <span className="block h-4 w-4 rounded-full border-2 border-white bg-[#B9722A] shadow-lg" />
      </span>
      {nodes.map((n) => (
        <span
          key={n.shape}
          className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/85 bg-white/90 shadow-lg backdrop-blur"
          style={{ left: `${n.x}%`, top: `${n.y}%`, color: n.tint }}
        >
          <ModeGlyph shape={n.shape} className="h-6 w-6" />
        </span>
      ))}
    </div>
  );
}
