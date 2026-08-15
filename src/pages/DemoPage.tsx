import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import { StreetMap } from '@/components/StreetMap';
import {
  COMMUNES,
  CRITERIA,
  comparePair,
  estimateCo2Grams,
  MODE_META,
  type DemoComparison,
  type DemoCriterion,
  type DemoMode,
} from '@/demo/scenario';
import { Wordmark } from '@/components/BrandMark';
import { Assistant } from '@/components/Assistant';
import { OnboardingOverlay } from '@/components/OnboardingOverlay';
import { hasSeenOnboarding, markOnboardingSeen } from '@/features/account/simAccount';
import {
  loadFavorites,
  loadRecents,
  pushRecent,
  toggleFavorite,
  tripKey,
  type SavedTrip,
} from '@/features/trips/savedTrips';
import { Conditions } from '@/components/Conditions';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { submitContribution } from '@/features/contributions/submit';
import { SIMULATION_BANNER } from '@/demo/simulation';
import type { BadgeCode, RankableOption } from '@/domain/ranking';

const XOF = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => XOF.format(n);
const km1 = (n: number) => n.toFixed(1).replace('.', ',');
const fmtCo2 = (g: number) =>
  g >= 1000 ? `${(g / 1000).toFixed(1).replace('.', ',')} kg` : `${g} g`;

const BADGE_LABEL: Record<BadgeCode, string> = {
  CHEAPEST: 'Moins cher',
  FASTEST: 'Plus rapide',
  BEST_VALUE: 'Meilleur rapport',
};

const GLYPH: Record<DemoMode, GlyphShape> = {
  VTC: 'vtc',
  TAXI: 'taxi',
  WORO: 'woro',
  GBAKA: 'gbaka',
};

function fareAmount(o: RankableOption): number | null {
  return o.fare.available ? o.fare.value.amount : null;
}

/* ---------------------------------------------------------------- primitives */

const AMBER = '#B9722A';
const WARN = '#9A3412';

function ModeChip({ mode, size = 44 }: { mode: DemoMode; size?: number }) {
  const m = MODE_META[mode];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{
        width: size,
        height: size,
        color: m.color,
        backgroundColor: `color-mix(in oklab, ${m.color} 14%, transparent)`,
      }}
      aria-hidden="true"
    >
      <ModeGlyph shape={GLYPH[mode]} className="h-2/3 w-2/3" />
    </span>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-muted-foreground/60"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function Badges({ codes }: { codes: BadgeCode[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {codes.map((c) => (
        <span
          key={c}
          className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
        >
          {BADGE_LABEL[c]}
        </span>
      ))}
    </div>
  );
}

function ConfidenceNote() {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-medium"
      style={{
        borderColor: `color-mix(in oklab, ${WARN} 35%, transparent)`,
        color: WARN,
        backgroundColor: `color-mix(in oklab, ${WARN} 7%, transparent)`,
      }}
    >
      <span aria-hidden="true">⚠︎</span>
      <span>
        Prix &amp; durées : exemples. Indice de confiance terrain : <b>0</b> (aucune observation
        réelle — DEP-004).
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------- shell */

type Section = 'app' | 'realvs' | 'about';
type View = 'search' | 'results' | 'detail' | 'contribute';

function AppBar() {
  return (
    <div className="sticky top-0 z-20">
      <div className="border-b border-white/10 bg-[#26301C]/90 text-white backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5 sm:px-6">
          <Wordmark className="text-base" />
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Quitter
          </Link>
        </div>
      </div>
      {/* Bandeau d'honnêteté — accordé à la palette (crème/encre, pointes ocre). */}
      <div
        className="flex items-center justify-center gap-2 border-b border-[#B9722A]/40 bg-[#F3EEDF]/95 px-3 py-1.5 text-center text-[11px] font-bold tracking-wide text-[#26301C] backdrop-blur"
        role="alert"
      >
        <span aria-hidden="true" className="text-[#B9722A]">
          ●
        </span>{' '}
        {SIMULATION_BANNER}{' '}
        <span aria-hidden="true" className="text-[#B9722A]">
          ●
        </span>
      </div>
    </div>
  );
}

const QUICK_TRIPS: { from: string; to: string }[] = [
  { from: 'yopougon', to: 'plateau' },
  { from: 'cocody', to: 'aeroport' },
  { from: 'abobo', to: 'adjame' },
  { from: 'marcory', to: 'plateau' },
];

const KNOWN = new Set(COMMUNES.map((c) => c.id));
const KNOWN_CRIT = new Set(CRITERIA.map((c) => c.code));
const isCommune = (v: string | null): v is string => v !== null && KNOWN.has(v);
const asCrit = (v: string | null): DemoCriterion =>
  v && KNOWN_CRIT.has(v as DemoCriterion) ? (v as DemoCriterion) : 'PRICE_TIME';

export default function DemoPage() {
  const [params, setParams] = useSearchParams();
  const urlFrom = params.get('de');
  const urlTo = params.get('a');
  const deepLinked = isCommune(urlFrom) && isCommune(urlTo) && urlFrom !== urlTo;

  const [section, setSection] = useState<Section>('app');
  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== 'undefined' && !hasSeenOnboarding(window.localStorage),
  );
  const [fromId, setFromId] = useState<string>(deepLinked ? urlFrom : 'cocody');
  const [toId, setToId] = useState<string>(deepLinked ? urlTo : 'plateau');
  const [criterion, setCriterion] = useState<DemoCriterion>(asCrit(params.get('tri')));
  const [view, setView] = useState<View>(deepLinked ? 'results' : 'search');
  const [optionId, setOptionId] = useState<string | null>(null);
  const [recents, setRecents] = useState<SavedTrip[]>(() =>
    typeof window === 'undefined' ? [] : loadRecents(window.localStorage),
  );
  const [favorites, setFavorites] = useState<SavedTrip[]>(() =>
    typeof window === 'undefined' ? [] : loadFavorites(window.localStorage),
  );
  useEffect(() => {
    if (deepLinked) setRecents(pushRecent(window.localStorage, { fromId: urlFrom, toId: urlTo }));
    // Dépendances vides à dessein : n'enregistrer que le trajet d'arrivée.
  }, []);

  const currentTrip: SavedTrip = { fromId, toId };
  const currentIsFavorite = favorites.some((t) => tripKey(t) === tripKey(currentTrip));

  function starCurrent() {
    setFavorites(toggleFavorite(window.localStorage, currentTrip));
  }

  const cmp: DemoComparison | null = useMemo(
    () => comparePair(fromId, toId, criterion),
    [fromId, toId, criterion],
  );

  const fromCommune = COMMUNES.find((c) => c.id === fromId);
  const toCommune = COMMUNES.find((c) => c.id === toId);

  /** Reflète le trajet dans l'URL (lien partageable / rechargeable). */
  function syncUrl(from: string, to: string, crit: DemoCriterion) {
    setParams({ de: from, a: to, tri: crit }, { replace: true });
  }

  function showResults(from: string, to: string, crit: DemoCriterion) {
    setFromId(from);
    setToId(to);
    setCriterion(crit);
    setView('results');
    syncUrl(from, to, crit);
    setRecents(pushRecent(window.localStorage, { fromId: from, toId: to }));
  }

  function pickCriterion(crit: DemoCriterion) {
    setCriterion(crit);
    if (view === 'results' || view === 'detail') syncUrl(fromId, toId, crit);
  }

  async function share() {
    const url = `${window.location.origin}/demo?de=${fromId}&a=${toId}&tri=${criterion}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien copié', { description: `${fromId} → ${toId} · ${url}` });
    } catch {
      toast('Lien du trajet', { description: url });
    }
  }

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  const badgesByOption = useMemo(() => {
    const map = new Map<string, BadgeCode[]>();
    cmp?.ranking.badges.forEach((b) => {
      const list = map.get(b.optionId) ?? [];
      list.push(b.code);
      map.set(b.optionId, list);
    });
    return map;
  }, [cmp]);

  function openDetail(id: string) {
    setOptionId(id);
    setView('detail');
  }

  const navItems: { key: Section; label: string }[] = [
    { key: 'app', label: 'Comparateur' },
    { key: 'realvs', label: 'Réel vs simulé' },
    { key: 'about', label: 'À propos' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppBar />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        {/* Navigation de sections */}
        <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {navItems.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setSection(n.key)}
              aria-pressed={section === n.key}
              className={
                'rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                (section === n.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {n.label}
            </button>
          ))}
        </div>

        {section === 'about' && <AboutSection />}
        {section === 'realvs' && <RealVsSimSection />}

        {section === 'app' && view === 'search' && (
          <section aria-label="Recherche">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Étape 1 · Recherche
            </p>
            <h1 className="mb-1 mt-1 text-2xl font-extrabold tracking-tight">Où allez-vous ?</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Choisissez une origine et une destination à Abidjan.
            </p>

            {/* Sélecteurs origine → destination */}
            <div className="relative flex flex-col gap-2 rounded-2xl border bg-card p-3">
              <CommuneSelect
                label="Départ"
                dotClass="bg-[#5C6B2E]"
                value={fromId}
                onChange={setFromId}
              />
              <div className="ml-1 h-3 border-l border-dashed" />
              <CommuneSelect
                label="Arrivée"
                dotClass="bg-[#B9722A]"
                value={toId}
                onChange={setToId}
              />
              <button
                type="button"
                onClick={swap}
                aria-label="Inverser origine et destination"
                className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l3-3M17 20l-3-3" />
                </svg>
              </button>
            </div>

            {fromId === toId && (
              <p className="mt-2 text-[12px] font-medium" style={{ color: WARN }}>
                Choisissez deux communes différentes.
              </p>
            )}

            <Button
              className="mt-4 h-12 w-full text-base"
              disabled={fromId === toId}
              onClick={() => showResults(fromId, toId, criterion)}
            >
              Comparer les modes →
            </Button>

            {favorites.length > 0 && (
              <>
                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  ★ Vos favoris
                </p>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((t) => {
                    const from = COMMUNES.find((c) => c.id === t.fromId);
                    const to = COMMUNES.find((c) => c.id === t.toId);
                    if (!from || !to) return null;
                    return (
                      <button
                        key={tripKey(t)}
                        type="button"
                        onClick={() => showResults(t.fromId, t.toId, criterion)}
                        className="rounded-full border border-[#B9722A]/50 bg-[#B9722A]/8 px-3 py-1.5 text-[12.5px] font-medium transition hover:border-[#B9722A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {from.name} → {to.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {recents.length > 0 && (
              <>
                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Récents
                </p>
                <div className="flex flex-wrap gap-2">
                  {recents.map((t) => {
                    const from = COMMUNES.find((c) => c.id === t.fromId);
                    const to = COMMUNES.find((c) => c.id === t.toId);
                    if (!from || !to) return null;
                    return (
                      <button
                        key={tripKey(t)}
                        type="button"
                        onClick={() => showResults(t.fromId, t.toId, criterion)}
                        className="rounded-full border bg-card px-3 py-1.5 text-[12.5px] font-medium transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {from.name} → {to.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Trajets fréquents */}
            <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Trajets fréquents
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TRIPS.map((t) => {
                const from = COMMUNES.find((c) => c.id === t.from)!;
                const to = COMMUNES.find((c) => c.id === t.to)!;
                return (
                  <button
                    key={`${t.from}-${t.to}`}
                    type="button"
                    onClick={() => showResults(t.from, t.to, criterion)}
                    className="rounded-full border bg-card px-3 py-1.5 text-[12.5px] font-medium transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {from.name} → {to.name}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-[11px] leading-snug text-muted-foreground">
              Positions des communes = <b>réelles</b>. Distances, durées et prix ={' '}
              <b style={{ color: WARN }}>estimations simulées</b> (à vol d’oiseau × facteur route,
              sans routage OSRM — DEP-001).
            </p>
          </section>
        )}

        {section === 'app' && view === 'results' && cmp && (
          <section aria-label="Résultats">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Étape 2 · Comparaison
            </p>
            <div className="mb-4 mt-1 flex items-baseline justify-between gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                {cmp.corridor.from} → {cmp.corridor.to}
                <button
                  type="button"
                  onClick={starCurrent}
                  aria-pressed={currentIsFavorite}
                  aria-label={currentIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill={currentIsFavorite ? '#B9722A' : 'none'}
                    stroke={currentIsFavorite ? '#B9722A' : 'currentColor'}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.2-5.6-3.1-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z" />
                  </svg>
                </button>
              </h1>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                ≈ {km1(cmp.corridor.km)} km · {cmp.options.length} modes
              </span>
            </div>

            {fromCommune && toCommune && (
              <figure className="mb-4 overflow-hidden rounded-2xl border">
                <StreetMap from={fromCommune} to={toCommune} />
                <figcaption className="bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
                  Fond © OpenStreetMap · tracé direct, sans calcul d’itinéraire (DEP-001)
                </figcaption>
              </figure>
            )}

            {/* Sélecteur de critère */}
            <div
              className="mb-3 flex gap-1 rounded-xl bg-muted p-1"
              role="group"
              aria-label="Trier par"
            >
              {CRITERIA.map((cr) => (
                <button
                  key={cr.code}
                  type="button"
                  onClick={() => pickCriterion(cr.code)}
                  aria-pressed={criterion === cr.code}
                  className={
                    'flex-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                    (criterion === cr.code
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  {cr.label}
                </button>
              ))}
            </div>
            {criterion === 'PRICE_TIME' && (
              <p className="mb-3 text-[11px] text-muted-foreground">
                Valeur du temps : {cmp.timeValueXofPerMinute} FCFA/min (exemple).
              </p>
            )}

            {/* Conditions du moment : météo réelle, trafic type */}
            <div className="mb-3">
              <Conditions />
            </div>

            <div className="mb-4">
              <ConfidenceNote />
            </div>

            {/* Pourquoi le n°1 */}
            {cmp.ranking.ranked[0] && (
              <div
                className="mb-4 rounded-xl border p-4"
                style={{
                  borderColor: `color-mix(in oklab, ${AMBER} 45%, transparent)`,
                  backgroundColor: `color-mix(in oklab, ${AMBER} 8%, transparent)`,
                }}
              >
                <div
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: WARN }}
                >
                  <span aria-hidden="true">★</span> Recommandé · pourquoi ?
                </div>
                <p className="mt-1.5 text-sm">
                  <b>{MODE_META[cmp.ranking.ranked[0].option.mode].label}</b> arrive 1<sup>er</sup>{' '}
                  sur « {CRITERIA.find((c) => c.code === criterion)?.label} » :{' '}
                  <span className="tabular-nums">{cmp.ranking.ranked[0].sortExplanation}</span>.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {cmp.ranking.ranked.map((r) => {
                const price = fareAmount(r.option);
                const codes = badgesByOption.get(r.option.optionId) ?? [];
                const m = MODE_META[r.option.mode];
                const winner = r.position === 1;
                return (
                  <button
                    key={r.option.optionId}
                    type="button"
                    onClick={() => openDetail(r.option.optionId)}
                    className={
                      'flex w-full items-center gap-3.5 rounded-2xl border bg-card p-4 text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                      (winner ? 'ring-1' : 'hover:border-foreground/30')
                    }
                    style={
                      winner ? { borderColor: AMBER, boxShadow: `0 0 0 1px ${AMBER}` } : undefined
                    }
                  >
                    <ModeChip mode={r.option.mode} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-bold">
                        <span
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold tabular-nums"
                          style={
                            winner
                              ? { backgroundColor: AMBER, color: '#26301C' }
                              : {
                                  backgroundColor: 'hsl(var(--muted))',
                                  color: 'hsl(var(--muted-foreground))',
                                }
                          }
                        >
                          {r.position}
                        </span>
                        {m.label}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{m.note}</span>
                      <Badges codes={codes} />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-extrabold tabular-nums leading-none">
                        {price !== null ? fmt(price) : '—'}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">FCFA</span>
                      <span className="mt-1 block text-[12px] tabular-nums text-muted-foreground">
                        {Math.round(r.option.durationSeconds! / 60)} min
                      </span>
                      <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
                        ≈ {fmtCo2(estimateCo2Grams(r.option.mode, cmp.corridor.km))} CO₂
                      </span>
                    </span>
                    <Chevron />
                  </button>
                );
              })}
            </div>

            {cmp.ranking.excluded.map((e) => (
              <div
                key={e.option.optionId}
                className="mt-2.5 rounded-2xl border border-dashed bg-muted/40 p-4 text-[12px] text-muted-foreground"
              >
                <b>{MODE_META[e.option.mode].label}</b> — non classé : {e.explanation}
              </div>
            ))}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setView('contribute')}>
                + Contribuer un tarif
              </Button>
              <Button variant="outline" onClick={share}>
                <svg
                  viewBox="0 0 24 24"
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                </svg>
                Partager
              </Button>
            </div>

            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Badges « moins cher / plus rapide / meilleur rapport » calculés par un classement{' '}
              <b>neutre</b> — aucun levier commercial (invariant I3).
            </p>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setView('search')}>
              ← Changer de trajet
            </Button>
          </section>
        )}

        {section === 'app' && view === 'contribute' && cmp && (
          <ContributeView
            comparison={cmp}
            fromId={fromId}
            toId={toId}
            onBack={() => setView('results')}
          />
        )}

        {section === 'app' && view === 'detail' && cmp && optionId && (
          <DetailView
            comparison={cmp}
            optionId={optionId}
            badgesByOption={badgesByOption}
            criterion={criterion}
            onBack={() => setView('results')}
          />
        )}
      </main>
      <Assistant />
      {showOnboarding && (
        <OnboardingOverlay
          onDone={() => {
            markOnboardingSeen(window.localStorage);
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

/** Sélecteur de commune (natif, stylé) avec pastille de repère. */
function CommuneSelect({
  label,
  dotClass,
  value,
  onChange,
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl px-1 py-1">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="-ml-0.5 w-full bg-transparent text-[15px] font-bold focus-visible:outline-none"
        >
          {COMMUNES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function DetailView({
  comparison: cmp,
  optionId,
  badgesByOption,
  criterion,
  onBack,
}: {
  comparison: DemoComparison;
  optionId: string;
  badgesByOption: Map<string, BadgeCode[]>;
  criterion: DemoCriterion;
  onBack: () => void;
}) {
  const ranked = cmp.ranking.ranked.find((r) => r.option.optionId === optionId);
  if (!ranked) return null;
  const o = ranked.option;
  const m = MODE_META[o.mode];
  const price = fareAmount(o);
  const codes = badgesByOption.get(o.optionId) ?? [];
  const justifications = cmp.ranking.badges.filter((b) => b.optionId === o.optionId);
  const trace = o.fare.available ? o.fare.trace : null;
  const critLabel = CRITERIA.find((c) => c.code === criterion)?.label ?? '';

  return (
    <section aria-label="Détail">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour à la comparaison
      </button>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Étape 3 · Résultat
      </p>

      <div className="my-3 flex items-center gap-3.5">
        <ModeChip mode={o.mode} size={56} />
        <div>
          <div className="text-xl font-extrabold">{m.label}</div>
          <div className="text-[12px] text-muted-foreground">
            {m.note}
            {m.kind === 'FLAT' ? ' · tarif forfaitaire (modèle simplifié)' : ''}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-extrabold tabular-nums leading-none">
            {price !== null ? fmt(price) : '—'}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-muted-foreground">FCFA · exemple</div>
        </div>
      </div>

      <ConfidenceNote />

      <div className="my-3 rounded-xl border bg-card p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Pourquoi ce classement ?
        </div>
        <p className="mt-1.5 text-sm">
          Classé{' '}
          <b>
            {ranked.position}
            <sup>{ranked.position === 1 ? 'er' : 'e'}</sup>
          </b>{' '}
          sur « {critLabel} » : <span className="tabular-nums">{ranked.sortExplanation}</span>.
        </p>
        {justifications.length > 0 && (
          <ul className="mt-2 space-y-1">
            {justifications.map((b) => (
              <li key={b.code} className="text-[12.5px]">
                <b>{BADGE_LABEL[b.code]}</b> — {b.justification}
              </li>
            ))}
          </ul>
        )}
        {codes.length === 0 && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Aucun badge : ce mode n’est premier sur aucun critère.
          </p>
        )}
      </div>

      <dl className="my-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-xl bg-muted/50 p-4 text-sm">
        <dt className="text-muted-foreground">Trajet</dt>
        <dd className="text-right font-semibold">
          {cmp.corridor.from} → {cmp.corridor.to}
        </dd>
        <dt className="text-muted-foreground">Distance</dt>
        <dd className="text-right font-semibold tabular-nums">{km1(cmp.corridor.km)} km</dd>
        <dt className="text-muted-foreground">Durée estimée</dt>
        <dd className="text-right font-semibold tabular-nums">
          {Math.round(o.durationSeconds! / 60)} min
        </dd>
        <dt className="text-muted-foreground">Empreinte carbone</dt>
        <dd className="text-right font-semibold tabular-nums">
          ≈ {fmtCo2(estimateCo2Grams(o.mode, cmp.corridor.km))} CO₂
        </dd>
      </dl>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Empreinte carbone : <b>estimation indicative</b> (facteurs génériques par passager ×
        distance simulée). Ordre de grandeur, non mesuré à Abidjan — les modes partagés émettent
        moins par personne grâce au taux d’occupation.
      </p>

      {trace && (
        <>
          <Separator className="my-4" />
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Trace du calcul (invariant I2)
          </div>
          <div
            className="mt-2 overflow-x-auto rounded-xl p-4 font-mono text-[11.5px] leading-relaxed"
            style={{ backgroundColor: '#26301C', color: '#cfe' }}
          >
            {trace.steps.map((s, i) => (
              <div key={i}>
                <span style={{ color: '#8A9A95' }}>{s.label}</span> = {s.formula}{' '}
                <span style={{ color: '#F2A100' }}>[{fmt(s.amount)}]</span>
              </div>
            ))}
            <div style={{ color: '#66807B' }}>
              itinéraire = {trace.routingProvider} · observations : {trace.observationCount} ·
              confiance : {trace.confidenceScore}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
            Dans le produit réel, cette trace citera l’itinéraire OSRM, la grille tarifaire datée et
            le nombre d’observations terrain. Ici, tout est <b style={{ color: WARN }}>simulé</b>.
          </p>
        </>
      )}
    </section>
  );
}

function ContributeView({
  comparison: cmp,
  fromId,
  toId,
  onBack,
}: {
  comparison: DemoComparison;
  fromId: string;
  toId: string;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<DemoMode>(cmp.options[0]!.mode);
  const [price, setPrice] = useState<string>('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (IS_BACKEND_CONFIGURED && !price) {
      toast('Indiquez le prix réellement payé', {
        description: 'Un relevé sans montant ne peut pas alimenter l’indice de confiance.',
      });
      return;
    }
    setSending(true);
    const result = await submitContribution({
      fromCommune: fromId,
      toCommune: toId,
      mode,
      priceXof: Number(price || 0),
      rushHour: null,
    });
    setSending(false);
    if (result.outcome === 'SAVED') {
      toast('Merci ! Relevé transmis', {
        description: `${MODE_META[mode].label} · ${price} FCFA — en file de modération avant publication (aucune donnée personnelle transmise).`,
      });
    } else if (result.outcome === 'ERROR') {
      toast('Échec de l’envoi — rien n’a été enregistré', { description: result.message });
      return;
    } else {
      toast('Simulation — rien n’a été enregistré', {
        description: `Dans le produit réel, votre relevé (${MODE_META[mode].label}${
          price ? ` · ${price} FCFA` : ''
        }) ferait monter l’indice de confiance de ce tarif (actuellement 0).`,
      });
    }
    setPrice('');
    onBack();
  }

  return (
    <section aria-label="Contribuer un tarif">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour à la comparaison
      </button>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Contribuer un tarif · {IS_BACKEND_CONFIGURED ? 'relevé réel' : 'simulation'}
      </p>
      <h2 className="mb-1 mt-1 text-xl font-extrabold">
        {cmp.corridor.from} → {cmp.corridor.to}
      </h2>
      {IS_BACKEND_CONFIGURED ? (
        <p className="mb-4 text-[12.5px] text-muted-foreground">
          Votre relevé du prix <b>réellement payé</b> part en file de modération, puis fait monter
          l’indice de confiance de ce corridor. Anonyme par conception : ni nom, ni téléphone, ni
          position précise — seulement commune de départ, d’arrivée, mode et prix.
        </p>
      ) : (
        <p className="mb-4 text-[12.5px] text-muted-foreground">
          Illustration du futur fonctionnement collaboratif : les usagers relèvent les prix
          réellement payés, ce qui fait monter l’indice de confiance.{' '}
          <b style={{ color: WARN }}>Aucune donnée n’est enregistrée ici.</b>
        </p>
      )}

      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Mode
      </label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {cmp.options.map((o) => (
          <button
            key={o.optionId}
            type="button"
            onClick={() => setMode(o.mode)}
            aria-pressed={mode === o.mode}
            className={
              'flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
              (mode === o.mode
                ? 'border-primary ring-1 ring-primary'
                : 'hover:border-foreground/30')
            }
          >
            <ModeChip mode={o.mode} size={30} />
            {MODE_META[o.mode].label}
          </button>
        ))}
      </div>

      <label
        htmlFor="contrib-price"
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        Prix payé (FCFA)
      </label>
      <input
        id="contrib-price"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="ex. 350"
        className="mb-4 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <Button className="h-11 w-full" onClick={submit} disabled={sending}>
        {sending ? 'Envoi…' : IS_BACKEND_CONFIGURED ? 'Envoyer mon relevé' : 'Envoyer (simulation)'}
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {IS_BACKEND_CONFIGURED
          ? 'Chaque relevé est modéré avant publication (détection d’aberrations, CDC M4). Rien n’est publié brut.'
          : 'Un vrai envoi passerait par une file modérée, avec masquage des données personnelles et recalage de l’indice de confiance.'}
      </p>
    </section>
  );
}

function RealVsSimSection() {
  return (
    <section aria-label="Réel vs simulé">
      <h2 className="mb-1 text-xl font-extrabold">Ce que montre cette démonstration</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Le <em>parcours</em> et la <em>mécanique de comparaison</em> sont réels. Seules les{' '}
        <em>valeurs</em> (lieux, distances, prix, durées) sont fictives.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3
            className="mb-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#2E9E5B' }}
          >
            Réel / prouvé
          </h3>
          <ul className="space-y-1.5 text-[12.5px]">
            <li>✓ Moteur de classement neutre (moins cher / plus rapide / meilleur rapport)</li>
            <li>✓ Principe de traçabilité du prix (invariant I2)</li>
            <li>✓ Absence honnête : indice de confiance affiché (invariant I1)</li>
            <li>✓ Socle testé en continu — CI verte</li>
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3
            className="mb-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: WARN }}
          >
            Simulé / fictif
          </h3>
          <ul className="space-y-1.5 text-[12.5px]">
            <li>≈ Lieux &amp; distances d’Abidjan</li>
            <li>≈ Prix en FCFA de chaque mode</li>
            <li>≈ Durées de trajet</li>
            <li>≈ Disponibilité des modes</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-muted/50 p-4 text-[12.5px] text-muted-foreground">
        <b className="text-foreground">Du fictif au réel :</b> quand DEP-001 (routage OSRM), DEP-002
        (grille officielle) et DEP-004 (relevés terrain) seront levées, on remplace la{' '}
        <b>source des données</b> (un seul fichier) — les écrans et la mécanique ne changent pas.
      </div>
    </section>
  );
}

function AboutSection() {
  const today = ['VTC', 'Taxi compteur', 'Woro-woro', 'Gbaka'];
  const tomorrow = ['Bus', 'BRT', 'Métro', 'Ferry', 'Vélo', 'Marche', 'Covoiturage'];
  const later = [
    'Horaires en temps réel',
    'Perturbations',
    'Empreinte carbone',
    'Accessibilité',
    'Coût total d’un trajet multimodal',
  ];
  return (
    <section aria-label="À propos">
      <h2 className="text-balance text-xl font-extrabold">
        Le premier moteur <span style={{ color: 'hsl(var(--primary))' }}>neutre</span> de
        comparaison des mobilités urbaines en Afrique
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Le comparateur n’est que la première fonctionnalité. La même plateforme pourra comparer tous
        les modes, sans levier commercial : le classement ignore structurellement l’existence d’un
        annonceur (invariant I3).
      </p>

      <div className="mt-4 rounded-xl border bg-card p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Aujourd’hui (démo)
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {today.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/12 px-2.5 py-1 text-[12px] font-semibold text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl border bg-card p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Demain (modes)
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tomorrow.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl border bg-card p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Plus tard (dimensions)
        </h3>
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {later.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl bg-muted/50 p-4 text-[12.5px] text-muted-foreground">
        <b className="text-foreground">Exigence de transparence.</b> Aucune donnée n’est inventée
        dans le produit : un prix sans observation terrain s’affiche comme non validé (confiance 0).
        Cette démonstration l’assume à chaque écran.
      </div>
    </section>
  );
}
