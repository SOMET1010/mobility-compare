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
  comparePoints,
  estimateCo2Grams,
  MODE_META,
  type DemoComparison,
  type DemoCriterion,
  type DemoMode,
} from '@/demo/scenario';
import { resolvePoint, roadEstimateKm } from '@/features/search/placeSearch';
import { cleanLineName, fetchLignes, fmtWalk, type LigneProche } from '@/features/transit/lignes';
import { SiteHeader } from '@/components/SiteHeader';
import { ConditionsBar } from '@/components/Conditions';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PlaceSheet, PlaceTrigger } from '@/components/PlaceField';
import { AdSlot } from '@/components/AdSlot';
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
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { fetchRoadRoute } from '@/features/routing/itineraire';
import { submitContribution } from '@/features/contributions/submit';
import { fetchApprovedCounts, type ObservationCounts } from '@/features/contributions/stats';
import { fetchPairAggregates, type ObservedAggregate } from '@/features/contributions/aggregate';
import {
  AGREMENT_LABEL,
  fetchPublishedOperators,
  type Operator,
} from '@/features/operators/operators';
import { SIMULATION_BANNER } from '@/demo/simulation';
import type { BadgeCode, RankableOption } from '@/domain/ranking';

const XOF = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => XOF.format(n);
const km1 = (n: number) => n.toFixed(1).replace('.', ',');
const fmtCo2 = (g: number) =>
  g >= 1000 ? `${(g / 1000).toFixed(1).replace('.', ',')} kg` : `${g} g`;

const BADGE_LABEL: Record<BadgeCode, string> = {
  CHEAPEST: '💰 Moins cher',
  FASTEST: '⚡ Plus rapide',
  BEST_VALUE: '⭐ Meilleur rapport',
};

/**
 * Minutes porte-à-porte : durée + attente. C'est sur CE total que le
 * classement départage (domain/ranking) — l'écran doit montrer le même
 * nombre que le moteur, pas la durée en véhicule seule.
 */
const minTotal = (o: { durationSeconds: number | null; waitSeconds: number | null }) =>
  Math.round(((o.durationSeconds ?? 0) + (o.waitSeconds ?? 0)) / 60);

/** Libellés courts des onglets de tri (le long vit dans CRITERIA.label). */
const CRIT_TAB: Record<DemoCriterion, string> = {
  PRICE: '💰 Prix',
  DURATION: '⚡ Rapide',
  PRICE_TIME: '★ Compromis',
};

/** Pastilles des lignes cartographiées (modes au-delà du comparateur). */
const LIGNE_META: Record<string, { label: string; emoji: string }> = {
  GBAKA: { label: 'Gbaka', emoji: '🚌' },
  WORO: { label: 'Wôrô-wôrô', emoji: '🚐' },
  BUS: { label: 'Bus', emoji: '🚍' },
  BATEAU: { label: 'Bateau-bus', emoji: '⛴️' },
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

/** Pastilles d'opérateurs publiés (I4) — nom + couleur de marque, depuis la base. */
function OperatorChips({ ops }: { ops: Operator[] }) {
  return (
    <>
      {ops.map((op) => (
        <span
          key={op.id}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[10.5px] font-bold text-foreground"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: op.brand_color ?? 'hsl(var(--muted-foreground))' }}
          />
          {op.label}
          {op.agrement_status === 'AGREE' && (
            <span
              aria-label="Plateforme agréée"
              title="Plateforme agréée"
              className="text-[#5C6B2E]"
            >
              ✓
            </span>
          )}
        </span>
      ))}
    </>
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
        Prix et durées donnés à titre indicatif — pas encore confirmés par des relevés sur le
        terrain.
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------- shell */

type View = 'search' | 'results' | 'detail' | 'contribute';

/** Bandeau d'honnêteté — accordé à la palette (crème/encre, pointes ocre). */
function HonestyBanner() {
  return (
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
/** Identifiant acceptable : quartier connu OU adresse `g~…` valide. */
const isCommune = (v: string | null): v is string => v !== null && resolvePoint(v) !== null;
const asCrit = (v: string | null): DemoCriterion =>
  v && KNOWN_CRIT.has(v as DemoCriterion) ? (v as DemoCriterion) : 'PRICE_TIME';

export default function DemoPage() {
  const [params, setParams] = useSearchParams();
  const urlFrom = params.get('de');
  const urlTo = params.get('a');
  const deepLinked = isCommune(urlFrom) && isCommune(urlTo) && urlFrom !== urlTo;

  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== 'undefined' && !hasSeenOnboarding(window.localStorage),
  );
  /** Écran de choix de lieu ouvert (à la Yango : plein écran, enchaîné). */
  const [sheet, setSheet] = useState<null | 'from' | 'to'>(null);
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
    if (deepLinked && KNOWN.has(urlFrom) && KNOWN.has(urlTo))
      setRecents(pushRecent(window.localStorage, { fromId: urlFrom, toId: urlTo }));
    // Dépendances vides à dessein : n'enregistrer que le trajet d'arrivée.
  }, []);

  const currentTrip: SavedTrip = { fromId, toId };
  const currentIsFavorite = favorites.some((t) => tripKey(t) === tripKey(currentTrip));

  function starCurrent() {
    setFavorites(toggleFavorite(window.localStorage, currentTrip));
  }

  // Distance routière EN DIRECT (notre serveur, via l'Edge Function
  // `itineraire`). Tant qu'elle n'est pas arrivée — ou si le serveur est
  // injoignable — la matrice précalculée (quartiers) ou le repli vol
  // d'oiseau (adresses) répond instantanément (invariant I1 : jamais
  // d'attente, jamais de valeur inventée).
  const [liveKm, setLiveKm] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLiveKm(null);
    const a = resolvePoint(fromId);
    const b = resolvePoint(toId);
    if (!a || !b || fromId === toId) return;
    fetchRoadRoute({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).then((r) => {
      if (!cancelled && r) setLiveKm(r.km);
    });
    return () => {
      cancelled = true;
    };
  }, [fromId, toId]);

  // Lignes cartographiées passant près du départ ET de l'arrivée (gbaka,
  // woro-woro, bus, bateau-bus) — la première brique de la décomposition
  // « de gare en gare ». Indisponible → la section n'apparaît pas.
  const [lignesProches, setLignesProches] = useState<LigneProche[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLignesProches(null);
    const a = resolvePoint(fromId);
    const b = resolvePoint(toId);
    if (!a || !b || fromId === toId) return;
    fetchLignes({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).then((l) => {
      if (!cancelled) setLignesProches(l);
    });
    return () => {
      cancelled = true;
    };
  }, [fromId, toId]);

  // Deux quartiers connus → chemin habituel (matrice + direct). Au moins
  // une adresse libre → corridor de points (distance serveur, repli estimé).
  const bothLieux = KNOWN.has(fromId) && KNOWN.has(toId);
  const cmp: DemoComparison | null = useMemo(() => {
    if (bothLieux) return comparePair(fromId, toId, criterion, liveKm ?? undefined);
    const a = resolvePoint(fromId);
    const b = resolvePoint(toId);
    if (!a || !b || fromId === toId) return null;
    return comparePoints(a.name, b.name, liveKm ?? roadEstimateKm(a, b), criterion);
  }, [bothLieux, fromId, toId, criterion, liveKm]);

  // Opérateurs publiés (invariant I4 — lus en base, jamais en dur).
  const [operators, setOperators] = useState<Operator[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedOperators().then((ops) => {
      if (!cancelled) setOperators(ops);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Observations réelles approuvées (RLS) — null si backend absent : rien n'est affiché.
  const [obsCounts, setObsCounts] = useState<ObservationCounts | null>(null);
  const [observed, setObserved] = useState<Partial<Record<DemoMode, ObservedAggregate>> | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    setObsCounts(null);
    setObserved(null);
    // Les relevés terrain sont indexés par quartier : un trajet d'adresses
    // libres n'en a pas (absence honnête, pas de rapprochement approximatif).
    if (!(KNOWN.has(fromId) && KNOWN.has(toId))) return;
    fetchApprovedCounts(fromId, toId).then((c) => {
      if (!cancelled) setObsCounts(c);
    });
    fetchPairAggregates(fromId, toId).then((a) => {
      if (!cancelled) setObserved(a);
    });
    return () => {
      cancelled = true;
    };
  }, [fromId, toId]);

  const fromCommune = resolvePoint(fromId);
  const toCommune = resolvePoint(toId);

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
    if (KNOWN.has(from) && KNOWN.has(to))
      setRecents(pushRecent(window.localStorage, { fromId: from, toId: to }));
  }

  function pickCriterion(crit: DemoCriterion) {
    setCriterion(crit);
    if (view === 'results' || view === 'detail') syncUrl(fromId, toId, crit);
  }

  async function share() {
    const url = `${window.location.origin}/comparer?de=${encodeURIComponent(fromId)}&a=${encodeURIComponent(toId)}&tri=${criterion}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien copié', { description: `${fromId} → ${toId} · ${url}` });
    } catch {
      toast('Lien du trajet', { description: url });
    }
  }

  /** Message WhatsApp : la réponse (prix + durées) directement dans le texte. */
  function shareWhatsApp() {
    if (!cmp) return;
    const url = `${window.location.origin}/comparer?de=${encodeURIComponent(fromId)}&a=${encodeURIComponent(toId)}&tri=${criterion}`;
    const critLabel = CRITERIA.find((c) => c.code === criterion)?.label ?? '';
    const lines = cmp.ranking.ranked.map((r) => {
      const p = fareAmount(r.option);
      const star = r.position === 1 ? '★ ' : '';
      return `${star}${MODE_META[r.option.mode].label} : ${p !== null ? `${fmt(p)} FCFA` : '—'} · ${minTotal(r.option)} min`;
    });
    const text = [
      `${cmp.corridor.from} → ${cmp.corridor.to} (${critLabel})`,
      ...lines,
      `Prix indicatifs — comparés sur MOBILIS : ${url}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  /** Partage Facebook : la carte riche (og:image) fait le travail visuel. */
  function shareFacebook() {
    const url = `${window.location.origin}/comparer?de=${encodeURIComponent(fromId)}&a=${encodeURIComponent(toId)}&tri=${criterion}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener',
    );
  }

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  /**
   * L'écart qui fait décider : le recommandé comparé au plus rapide (ce
   * qu'on économise) ou au moins cher (ce qu'on gagne). Jamais inventé —
   * calculé sur les options affichées, null si rien à dire.
   */
  const insight = useMemo(() => {
    const ranked = cmp?.ranking.ranked.filter((r) => fareAmount(r.option) !== null);
    if (!ranked || ranked.length < 2) return null;
    const gagnant = ranked[0]!;
    const prixGagnant = fareAmount(gagnant.option)!;
    const rapide = ranked.reduce((a, b) => (minTotal(a.option) <= minTotal(b.option) ? a : b));
    const econome = ranked.reduce((a, b) =>
      fareAmount(a.option)! <= fareAmount(b.option)! ? a : b,
    );
    if (rapide.option.optionId !== gagnant.option.optionId) {
      const economie = fareAmount(rapide.option)! - prixGagnant;
      const surplus = minTotal(gagnant.option) - minTotal(rapide.option);
      if (economie > 0 && surplus > 0) {
        return `Économisez ${fmt(economie)} F · +${surplus} min vs ${MODE_META[rapide.option.mode].label}`;
      }
    }
    if (econome.option.optionId !== gagnant.option.optionId) {
      const surcout = prixGagnant - fareAmount(econome.option)!;
      const gain = minTotal(econome.option) - minTotal(gagnant.option);
      if (surcout > 0 && gain > 0) {
        return `Gagnez ${gain} min · +${fmt(surcout)} F vs ${MODE_META[econome.option.mode].label}`;
      }
    }
    return null;
  }, [cmp]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/observatoire', label: 'Observatoire' },
          { to: '/methode', label: 'Méthode' },
          { to: '/partenaires', label: 'Partenaires' },
          { to: '/compte', label: 'Compte' },
        ]}
        cta={null}
        banner={
          <>
            <HonestyBanner />
            <ConditionsBar />
          </>
        }
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        {view === 'search' && (
          <section aria-label="Recherche">
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight">On va où ?</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Choisissez le départ et l’arrivée — on compare les prix pour vous.
            </p>

            {/* Sélecteurs origine → destination — le choix se fait plein écran */}
            <div className="relative flex flex-col gap-2 rounded-2xl border bg-card p-3">
              <PlaceTrigger
                label="Départ"
                dotClass="bg-[#5C6B2E]"
                value={fromId}
                onPress={() => setSheet('from')}
              />
              <div className="ml-1 h-3 border-l border-dashed" />
              <PlaceTrigger
                label="Arrivée"
                dotClass="bg-[#B9722A]"
                value={toId}
                onPress={() => setSheet('to')}
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
                Choisissez une autre destination.
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
              Distances <b>routières réelles</b> (OpenStreetMap). Prix et durées :{' '}
              <b style={{ color: WARN }}>estimations</b>.
            </p>
          </section>
        )}

        {view === 'results' && cmp && (
          <section aria-label="Résultats">
            <div className="mb-4 mt-1 flex items-baseline justify-between gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                <button
                  type="button"
                  onClick={() => setView('search')}
                  aria-label="Modifier le trajet"
                  title="Modifier le trajet"
                  className="inline-flex items-center gap-2 rounded-lg text-left underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {cmp.corridor.from} → {cmp.corridor.to}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                {bothLieux && (
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
                )}
              </h1>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                ≈ {km1(cmp.corridor.km)} km
              </span>
            </div>

            {/* Sélecteur de critère — collant pendant le défilement */}
            <div
              className="sticky top-0 z-30 mb-3 flex gap-1 rounded-xl bg-muted p-1 shadow-sm"
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
                      ? 'bg-background font-bold text-foreground shadow-sm ring-1 ring-[#B9722A]/45'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  {CRIT_TAB[cr.code]}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Toutes les options
            </p>
            <div className="flex flex-col gap-2.5">
              {(() => {
                const renderCard = (r: (typeof cmp.ranking.ranked)[number]) => {
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
                        'flex w-full flex-wrap items-center gap-3.5 rounded-2xl border bg-card p-4 text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                        (winner ? 'ring-1' : 'hover:border-foreground/30')
                      }
                      style={
                        winner ? { borderColor: AMBER, boxShadow: `0 0 0 1px ${AMBER}` } : undefined
                      }
                    >
                      {winner && (
                        <span
                          className="-mb-1 flex basis-full items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest"
                          style={{ color: WARN }}
                        >
                          <span aria-hidden="true">★</span> Recommandé ·{' '}
                          {CRITERIA.find((c) => c.code === criterion)?.label}
                        </span>
                      )}
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
                        <span className="block text-2xl font-extrabold tabular-nums leading-none">
                          {price !== null ? fmt(price) : '—'}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          FCFA
                        </span>
                        <span className="mt-0.5 block text-[14px] font-bold tabular-nums text-foreground/80">
                          {minTotal(r.option)} min
                        </span>
                        {r.option.waitSeconds ? (
                          <span className="block text-[10px] tabular-nums text-muted-foreground">
                            dont {Math.round(r.option.waitSeconds / 60)} d’attente
                          </span>
                        ) : null}
                      </span>
                      <Chevron />
                      {winner && insight && (
                        <span className="-mt-1 block basis-full text-[12.5px] font-bold leading-snug text-[#5C6B2E]">
                          {insight}
                        </span>
                      )}
                      {(() => {
                        const ops = operators?.filter((op) => op.mode === r.option.mode) ?? [];
                        const agg = observed?.[r.option.mode];
                        const releves = agg && agg.count > 0 ? agg : null;
                        if (ops.length === 0 && !releves) return null;
                        return (
                          <span className="-mt-1 flex basis-full flex-wrap items-center gap-1.5 border-t pt-1.5">
                            {ops.length > 0 && <OperatorChips ops={ops} />}
                            {releves && (
                              <span
                                title="Prix réellement payés, déposés par des usagers puis modérés"
                                className="inline-flex items-center gap-1 rounded-full bg-[#5C6B2E]/10 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-[#5C6B2E]"
                              >
                                ✓{' '}
                                {releves.medianXof !== null
                                  ? `~${fmt(releves.medianXof)} F observé (${releves.count})`
                                  : `${releves.count} relevé${releves.count > 1 ? 's' : ''} terrain`}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </button>
                  );
                };
                // Une option = UNE carte, dans l'ordre du classement — les
                // badges (💰 ⚡ ⭐) portent les distinctions, jamais des
                // sections dupliquées.
                return <>{cmp.ranking.ranked.map((r) => renderCard(r))}</>;
              })()}
            </div>

            {/* Lignes cartographiées — première brique « de gare en gare » */}
            {lignesProches && lignesProches.length > 0 && (
              <div className="mt-4 rounded-2xl border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Lignes passant près de ce trajet
                </p>
                <ul className="mt-2 space-y-2">
                  {lignesProches.slice(0, 6).map((l) => {
                    const montee = fmtWalk(l.montee_m);
                    const descente = fmtWalk(l.descente_m);
                    return (
                      <li key={`${l.mode}-${l.nom}`} className="text-[13px]">
                        <div className="flex items-baseline gap-2">
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold">
                            {LIGNE_META[l.mode]?.emoji ?? '🚏'}{' '}
                            {LIGNE_META[l.mode]?.label ?? l.mode}
                            {l.ref ? ` ${l.ref}` : ''}
                          </span>
                          <span className="min-w-0 truncate font-medium">
                            {cleanLineName(l.nom)}
                          </span>
                        </div>
                        {montee && descente && (
                          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                            🚶 montée {montee} du départ · descente {descente} de l’arrivée
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
                  Réseau cartographié (OpenStreetMap) — tracés réels, sans horaires ni tarifs.
                </p>
              </div>
            )}

            {cmp.ranking.excluded.map((e) => (
              <div
                key={e.option.optionId}
                className="mt-2.5 rounded-2xl border border-dashed bg-muted/40 p-4 text-[12px] text-muted-foreground"
              >
                <b>{MODE_META[e.option.mode].label}</b> — non classé : {e.explanation}
              </div>
            ))}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={shareWhatsApp}
                className="border-[#25D366]/40 px-2 text-[#128C4A] hover:bg-[#25D366]/10 hover:text-[#128C4A]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mr-1.5 h-4 w-4"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2a10 10 0 0 0-8.63 15.03L2 22l5.13-1.34A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.04.8.81-2.97-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.13c-.25-.13-1.46-.72-1.68-.8-.23-.08-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.53.06-.25-.13-1.04-.39-1.99-1.23-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.1-.5.12-.12.25-.3.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.44.06-.67.31-.22.25-.87.85-.87 2.07 0 1.22.9 2.4 1.02 2.57.13.16 1.76 2.68 4.25 3.76.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.67-1.18.2-.57.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28z" />
                </svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={shareFacebook}
                className="border-[#1877F2]/40 px-2 text-[#1877F2] hover:bg-[#1877F2]/10 hover:text-[#1877F2]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mr-1.5 h-4 w-4"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.62.77-1.62 1.56V12h2.76l-.44 2.89h-2.32v6.99A10 10 0 0 0 22 12z" />
                </svg>
                Facebook
              </Button>
              <Button variant="outline" onClick={share} className="px-2">
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
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Lien
              </Button>
            </div>
            {bothLieux && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => setView('contribute')}
              >
                + Partager un prix payé
              </Button>
            )}
            <InstallPrompt />

            {fromCommune && toCommune && (
              <>
                <figure className="mt-4 overflow-hidden rounded-2xl border">
                  <StreetMap from={fromCommune} to={toCommune} />
                  <figcaption className="bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
                    Fond © OpenStreetMap · tracé indicatif
                  </figcaption>
                </figure>
                {/* Navigation externe — au choix de l'usager (la destination est transmise à l'app choisie) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                  <span className="font-semibold">S’y rendre :</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${toCommune.lat},${toCommune.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Google Maps
                  </a>
                  <a
                    href={`https://waze.com/ul?ll=${toCommune.lat},${toCommune.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Waze
                  </a>
                  <span className="opacity-70">(votre destination leur est transmise)</span>
                </div>
              </>
            )}

            <div className="mt-3">
              <AdSlot slotId="resultats" />
            </div>

            <details className="group mt-3 rounded-xl border bg-card">
              <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
                ⓘ Comprendre ces chiffres — exemples, observations, neutralité
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <ConfidenceNote />
                {obsCounts && obsCounts.total > 0 && (
                  <p className="flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-[#5C6B2E]">
                    <span aria-hidden="true">🌱</span>
                    <span>
                      {obsCounts.total} observation{obsCounts.total > 1 ? 's' : ''} réelle
                      {obsCounts.total > 1 ? 's' : ''} déjà collectée
                      {obsCounts.total > 1 ? 's' : ''} et modérée{obsCounts.total > 1 ? 's' : ''}
                      {obsCounts.pair > 0 ? ` — dont ${obsCounts.pair} sur ce trajet` : ''}.
                    </span>
                  </p>
                )}
                {criterion === 'PRICE_TIME' && (
                  <p className="text-[11px] text-muted-foreground">
                    Valeur du temps : {cmp.timeValueXofPerMinute} FCFA/min (exemple).
                  </p>
                )}
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Ordre d’affichage : les VTC d’abord. Les badges « moins cher / plus rapide /
                  meilleur rapport » restent calculés de façon <b>neutre</b> sur tous les modes —
                  aucun opérateur ne peut acheter sa place.
                </p>
                <Link
                  to="/methode#faq"
                  className="inline-block text-[12px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Toutes les questions fréquentes →
                </Link>
              </div>
            </details>

            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setView('search')}>
              ← Changer de trajet
            </Button>
          </section>
        )}

        {view === 'contribute' && cmp && (
          <ContributeView
            comparison={cmp}
            fromId={fromId}
            toId={toId}
            onBack={() => setView('results')}
          />
        )}

        {view === 'detail' && cmp && optionId && (
          <DetailView
            comparison={cmp}
            optionId={optionId}
            badgesByOption={badgesByOption}
            criterion={criterion}
            observed={observed}
            operators={operators}
            onBack={() => setView('results')}
          />
        )}
      </main>
      {sheet && (
        <PlaceSheet
          label={sheet === 'from' ? 'Départ' : 'Arrivée'}
          withGeolocation={sheet === 'from'}
          recentIds={recents.flatMap((t) => [t.fromId, t.toId])}
          onClose={() => setSheet(null)}
          onPick={(id) => {
            if (sheet === 'from') {
              setFromId(id);
              // Enchaînement à la Yango : départ choisi → on demande l'arrivée.
              setSheet('to');
            } else {
              setToId(id);
              setSheet(null);
              if (id !== fromId) showResults(fromId, id, criterion);
            }
          }}
        />
      )}
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

function DetailView({
  comparison: cmp,
  optionId,
  badgesByOption,
  criterion,
  observed,
  operators,
  onBack,
}: {
  comparison: DemoComparison;
  optionId: string;
  badgesByOption: Map<string, BadgeCode[]>;
  criterion: DemoCriterion;
  observed: Partial<Record<DemoMode, ObservedAggregate>> | null;
  operators: Operator[] | null;
  onBack: () => void;
}) {
  const ranked = cmp.ranking.ranked.find((r) => r.option.optionId === optionId);
  if (!ranked) return null;
  const o = ranked.option;
  const agg = observed?.[o.mode];
  const modeOperators = operators?.filter((op) => op.mode === o.mode) ?? [];
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

      <div className="my-3 flex items-center gap-3.5">
        <ModeChip mode={o.mode} size={56} />
        <div>
          <div className="text-xl font-extrabold">{m.label}</div>
          <div className="text-[12px] text-muted-foreground">
            {m.note}
            {m.kind === 'FLAT' ? ' · tarif fixe' : ''}
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
        <dt className="text-muted-foreground">Durée porte-à-porte</dt>
        <dd className="text-right font-semibold tabular-nums">{minTotal(o)} min</dd>
        {o.waitSeconds ? (
          <>
            <dt className="pl-3 text-muted-foreground">dont attente</dt>
            <dd className="text-right font-semibold tabular-nums">
              {Math.round(o.waitSeconds / 60)} min
            </dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Empreinte carbone</dt>
        <dd className="text-right font-semibold tabular-nums">
          ≈ {fmtCo2(estimateCo2Grams(o.mode, cmp.corridor.km))} CO₂
        </dd>
        {agg && agg.count > 0 && (
          <>
            <dt className="text-muted-foreground">Prix observé (réel)</dt>
            <dd className="text-right font-semibold tabular-nums text-[#5C6B2E]">
              {agg.medianXof !== null
                ? `~${fmt(agg.medianXof)} FCFA · ${agg.count} relevés`
                : `${agg.count} relevé${agg.count > 1 ? 's' : ''} (médiane dès 5)`}
            </dd>
          </>
        )}
      </dl>
      {modeOperators.length > 0 && (
        <div className="my-3 rounded-xl border bg-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Opérateurs — statut d’agrément vérifié
          </div>
          <ul className="mt-2 space-y-1.5">
            {modeOperators.map((op) => (
              <li key={op.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{op.label}</span>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                    (op.agrement_status === 'AGREE'
                      ? 'bg-[#5C6B2E]/12 text-[#5C6B2E]'
                      : 'bg-muted text-muted-foreground')
                  }
                >
                  {AGREMENT_LABEL[op.agrement_status]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Vérifié le{' '}
            {modeOperators[0]?.status_verified_at
              ? new Date(modeOperators[0].status_verified_at).toLocaleDateString('fr-FR')
              : '—'}{' '}
            ({modeOperators[0]?.status_source ?? 'source à renseigner'}) · aucune affiliation.
          </p>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Empreinte carbone : <b>estimation indicative</b>, non mesurée à Abidjan.
      </p>

      {trace && (
        <>
          <Separator className="my-4" />
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Le calcul, ligne par ligne
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
            Trace <b style={{ color: WARN }}>simulée</b> — le produit réel citera grille datée et
            relevés terrain.
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
        Partager un prix payé · {IS_BACKEND_CONFIGURED ? 'relevé réel' : 'simulation'}
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
