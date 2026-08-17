import { useEffect, useMemo, useRef, useState } from 'react';
import { COULEURS } from '@/config/couleurs';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StreetMap, type TraceLayer } from '@/components/StreetMap';
import {
  COMMUNES,
  CRITERIA,
  comparePair,
  comparePoints,
  MODE_META,
  type DemoComparison,
  type DemoCriterion,
  type DemoMode,
  type ServiceType,
} from '@/demo/scenario';
import { resolvePoint, roadEstimateKm } from '@/features/search/placeSearch';
import {
  cleanLineName,
  fetchLignes,
  fetchTrace,
  fmtWalk,
  totalWalkM,
  type Correspondance,
  type LigneProche,
  type TransitInfo,
} from '@/features/transit/lignes';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PlaceSheet, PlaceTrigger } from '@/components/PlaceField';
import { Segmented } from '@/components/Segmented';
import { AdSlot } from '@/components/AdSlot';
import { OnboardingOverlay } from '@/components/OnboardingOverlay';
import { hasSeenOnboarding, markOnboardingSeen } from '@/features/account/simAccount';
import {
  loadFavorites,
  loadRecents,
  pushRecent,
  toggleFavorite,
  tripKey,
  tripService,
  type SavedTrip,
} from '@/features/trips/savedTrips';
import { fetchRoadRoute } from '@/features/routing/itineraire';
import { fetchApprovedCounts, type ObservationCounts } from '@/features/contributions/stats';
import { fetchPairAggregates, type ObservedAggregate } from '@/features/contributions/aggregate';
import { fetchPublishedOperators, type Operator } from '@/features/operators/operators';
import type { BadgeCode } from '@/domain/ranking';
import {
  AMBER,
  Badges,
  Chevron,
  ConfidenceNote,
  CRIT_OPTS,
  fareAmount,
  fmt,
  km1,
  LIGNE_META,
  minTotal,
  ModeChip,
  OperatorChips,
  SERVICE_OPTS,
  TRACE1,
  TRACE2,
  WARN,
} from '@/pages/comparateur/ui';
import { DetailView } from '@/pages/comparateur/DetailView';
import { ContributeView } from '@/pages/comparateur/ContributeView';

/* --------------------------------------------------------------------- shell */

type View = 'search' | 'results' | 'detail' | 'contribute';

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
  const navigate = useNavigate();
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
  const [service, setService] = useState<ServiceType>(
    params.get('quoi') === 'livraison' ? 'LIVRAISON' : 'COURSE',
  );
  // Les vues internes vivent dans l'URL : le bouton retour du téléphone
  // revient à l'écran précédent au lieu de quitter le comparateur, et
  // chaque écran (résultats, fiche détail) devient partageable.
  const paramVue = params.get('vue');
  const optionId = params.get('option');
  const view: View =
    paramVue === 'detail' && optionId
      ? 'detail'
      : paramVue === 'contribuer'
        ? 'contribute'
        : paramVue === 'resultats'
          ? 'results'
          : paramVue === 'recherche'
            ? 'search'
            : deepLinked
              ? 'results'
              : 'search';
  const vueParam =
    view === 'results'
      ? ('resultats' as const)
      : view === 'detail'
        ? ('detail' as const)
        : view === 'contribute'
          ? ('contribuer' as const)
          : ('recherche' as const);
  const [recents, setRecents] = useState<SavedTrip[]>(() =>
    typeof window === 'undefined' ? [] : loadRecents(window.localStorage),
  );
  const [favorites, setFavorites] = useState<SavedTrip[]>(() =>
    typeof window === 'undefined' ? [] : loadFavorites(window.localStorage),
  );
  useEffect(() => {
    if (deepLinked && KNOWN.has(urlFrom) && KNOWN.has(urlTo))
      setRecents(pushRecent(window.localStorage, { fromId: urlFrom, toId: urlTo, service }));
    // Dépendances vides à dessein : n'enregistrer que le trajet d'arrivée.
  }, []);

  const currentTrip: SavedTrip = { fromId, toId, service };
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
  const [transit, setTransit] = useState<TransitInfo | null>(null);
  const [showAllLines, setShowAllLines] = useState(false);
  // Tracé(s) affiché(s) sur la carte — toucher une ligne (un tracé) ou
  // une correspondance (deux tracés + le point de changement).
  const [traceSel, setTraceSel] = useState<{ key: string; label: string } | null>(null);
  const [traceLayers, setTraceLayers] = useState<TraceLayer[] | null>(null);
  const [changePoint, setChangePoint] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const traceReqRef = useRef<string | null>(null);
  const mapFigureRef = useRef<HTMLElement | null>(null);

  function clearTrace() {
    traceReqRef.current = null;
    setTraceSel(null);
    setTraceLayers(null);
    setChangePoint(null);
  }

  function ligneLabel(mode: string, ref: string): string {
    return `${LIGNE_META[mode]?.label ?? mode}${ref ? ` ${ref}` : ''}`;
  }

  function traceIndisponible() {
    clearTrace();
    toast.error('Tracé indisponible pour le moment', {
      description: 'Rien n’est dessiné plutôt qu’un tracé inventé.',
    });
  }

  async function toggleTrace(l: LigneProche) {
    if (typeof l.id !== 'number') return;
    const key = `l:${l.id}`;
    if (traceSel?.key === key) {
      clearTrace();
      return;
    }
    traceReqRef.current = key;
    setTraceSel({ key, label: `Tracé : ${ligneLabel(l.mode, l.ref)}` });
    setTraceLayers(null);
    setChangePoint(null);
    const segs = await fetchTrace(l.id);
    if (traceReqRef.current !== key) return; // l'usager a changé d'avis entre-temps
    if (!segs) {
      traceIndisponible();
      return;
    }
    setTraceLayers([{ segments: segs, color: TRACE1 }]);
    mapFigureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function toggleCorrTrace(c: Correspondance) {
    if (typeof c.ligne1_id !== 'number' || typeof c.ligne2_id !== 'number') return;
    const key = `c:${c.ligne1_id}:${c.ligne2_id}`;
    if (traceSel?.key === key) {
      clearTrace();
      return;
    }
    traceReqRef.current = key;
    const label =
      `Tracés : ${ligneLabel(c.mode1, c.ref1)} + ${ligneLabel(c.mode2, c.ref2)}` +
      (c.gare ? ` · changement : ${c.gare}` : '');
    setTraceSel({ key, label });
    setTraceLayers(null);
    setChangePoint(null);
    const [s1, s2] = await Promise.all([fetchTrace(c.ligne1_id), fetchTrace(c.ligne2_id)]);
    if (traceReqRef.current !== key) return;
    if (!s1 || !s2) {
      traceIndisponible();
      return;
    }
    setTraceLayers([
      { segments: s1, color: TRACE1 },
      { segments: s2, color: TRACE2 },
    ]);
    if (typeof c.corr_lat === 'number' && typeof c.corr_lng === 'number') {
      setChangePoint({ lat: c.corr_lat, lng: c.corr_lng, label: c.gare ?? 'Changement de ligne' });
    }
    mapFigureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  useEffect(() => {
    let cancelled = false;
    setTransit(null);
    setShowAllLines(false);
    clearTrace();
    const a = resolvePoint(fromId);
    const b = resolvePoint(toId);
    if (!a || !b || fromId === toId) return;
    fetchLignes({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).then((l) => {
      if (!cancelled) setTransit(l);
    });
    return () => {
      cancelled = true;
    };
  }, [fromId, toId]);

  // Deux quartiers connus → chemin habituel (matrice + direct). Au moins
  // une adresse libre → corridor de points (distance serveur, repli estimé).
  const bothLieux = KNOWN.has(fromId) && KNOWN.has(toId);
  const cmp: DemoComparison | null = useMemo(() => {
    if (bothLieux) return comparePair(fromId, toId, criterion, liveKm ?? undefined, service);
    const a = resolvePoint(fromId);
    const b = resolvePoint(toId);
    if (!a || !b || fromId === toId) return null;
    return comparePoints(a.name, b.name, liveKm ?? roadEstimateKm(a, b), criterion, service);
  }, [bothLieux, fromId, toId, criterion, liveKm, service]);

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

  /**
   * L'URL est la source de vérité des écrans internes. Sans `replace`,
   * chaque changement d'écran crée une entrée d'historique — le retour
   * arrière du navigateur redevient un geste fiable.
   */
  function allerA(
    vue: 'recherche' | 'resultats' | 'detail' | 'contribuer',
    opts: {
      from?: string;
      to?: string;
      crit?: DemoCriterion;
      svc?: ServiceType;
      option?: string;
      replace?: boolean;
    } = {},
  ) {
    const p: Record<string, string> = {
      de: opts.from ?? fromId,
      a: opts.to ?? toId,
      tri: opts.crit ?? criterion,
      vue,
    };
    if ((opts.svc ?? service) === 'LIVRAISON') p.quoi = 'livraison';
    if (opts.option) p.option = opts.option;
    setParams(p, { replace: opts.replace ?? false });
  }

  /** Retour aux résultats : le même geste que le bouton arrière du téléphone. */
  function retourResultats() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else allerA('resultats', { replace: true });
  }

  function pickService(svc: ServiceType) {
    setService(svc);
    if (view !== 'search') allerA(vueParam, { svc, option: optionId ?? undefined, replace: true });
  }

  function showResults(from: string, to: string, crit: DemoCriterion) {
    setFromId(from);
    setToId(to);
    setCriterion(crit);
    allerA('resultats', { from, to, crit });
    if (KNOWN.has(from) && KNOWN.has(to))
      setRecents(pushRecent(window.localStorage, { fromId: from, toId: to, service }));
  }

  function pickCriterion(crit: DemoCriterion) {
    setCriterion(crit);
    if (view !== 'search') allerA(vueParam, { crit, option: optionId ?? undefined, replace: true });
  }

  async function share() {
    const url = `${window.location.origin}/comparer?de=${encodeURIComponent(fromId)}&a=${encodeURIComponent(toId)}&tri=${criterion}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié', { description: `${fromId} → ${toId} · ${url}` });
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
    allerA('detail', { option: id });
  }

  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        {view === 'search' && (
          <section aria-label="Recherche">
            {/* Personne ou colis — même comparateur, modes différents */}
            <Segmented
              className="mb-4"
              ariaLabel="Type de prestation"
              options={SERVICE_OPTS}
              value={service}
              onChange={pickService}
            />
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight">
              {service === 'LIVRAISON' ? 'On envoie où ?' : 'On va où ?'}
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">
              {service === 'LIVRAISON'
                ? 'Choisissez l’enlèvement et la livraison — on compare les prix pour vous.'
                : 'Choisissez le départ et l’arrivée — on compare les prix pour vous.'}
            </p>

            {/* Sélecteurs origine → destination — le choix se fait plein écran */}
            <div className="relative flex flex-col gap-2 rounded-2xl border bg-card p-3">
              <PlaceTrigger
                label={service === 'LIVRAISON' ? 'Enlèvement' : 'Départ'}
                dotClass="bg-brand-olive"
                value={fromId}
                onPress={() => setSheet('from')}
              />
              <div className="ml-1 h-3 border-l border-dashed" />
              <PlaceTrigger
                label={service === 'LIVRAISON' ? 'Livraison' : 'Arrivée'}
                dotClass="bg-brand-ochre"
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
              <p className="mt-2 text-note font-medium" style={{ color: WARN }}>
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
                <p className="mb-2 mt-6 text-label font-bold uppercase tracking-wider text-muted-foreground">
                  ★ Vos favoris
                </p>
                <div className="flex flex-wrap gap-2">
                  {favorites
                    .filter((t) => tripService(t) === service)
                    .map((t) => {
                      const from = COMMUNES.find((c) => c.id === t.fromId);
                      const to = COMMUNES.find((c) => c.id === t.toId);
                      if (!from || !to) return null;
                      return (
                        <button
                          key={tripKey(t)}
                          type="button"
                          onClick={() => showResults(t.fromId, t.toId, criterion)}
                          className="rounded-full border border-brand-ochre/50 bg-brand-ochre/8 px-3 py-1.5 text-note font-medium transition hover:border-brand-ochre focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="mb-2 mt-6 text-label font-bold uppercase tracking-wider text-muted-foreground">
                  Récents
                </p>
                <div className="flex flex-wrap gap-2">
                  {recents
                    .filter((t) => tripService(t) === service)
                    .map((t) => {
                      const from = COMMUNES.find((c) => c.id === t.fromId);
                      const to = COMMUNES.find((c) => c.id === t.toId);
                      if (!from || !to) return null;
                      return (
                        <button
                          key={tripKey(t)}
                          type="button"
                          onClick={() => showResults(t.fromId, t.toId, criterion)}
                          className="rounded-full border bg-card px-3 py-1.5 text-note font-medium transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {from.name} → {to.name}
                        </button>
                      );
                    })}
                </div>
              </>
            )}

            {/* Trajets fréquents */}
            <p className="mb-2 mt-6 text-label font-bold uppercase tracking-wider text-muted-foreground">
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
                    className="rounded-full border bg-card px-3 py-1.5 text-note font-medium transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {from.name} → {to.name}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-label leading-snug text-muted-foreground">
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
                  onClick={() => allerA('recherche')}
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
                      fill={currentIsFavorite ? COULEURS.ochre : 'none'}
                      stroke={currentIsFavorite ? COULEURS.ochre : 'currentColor'}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.2-5.6-3.1-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z" />
                    </svg>
                  </button>
                )}
              </h1>
              <span
                className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground"
                title={
                  liveKm !== null
                    ? 'Distance routière calculée par notre serveur'
                    : 'Distance estimée — sera affinée par notre serveur'
                }
              >
                ≈ {km1(cmp.corridor.km)} km{liveKm !== null ? ' ✓' : ''}
              </span>
            </div>

            {/* Personne ou colis */}
            <Segmented
              className="mb-2"
              ariaLabel="Type de prestation"
              options={SERVICE_OPTS}
              value={service}
              onChange={pickService}
            />

            {/* Sélecteur de critère — collant pendant le défilement */}
            <Segmented
              className="sticky top-0 z-30 mb-3 shadow-sm"
              ariaLabel="Trier par"
              options={CRIT_OPTS}
              value={criterion}
              onChange={pickCriterion}
            />
            <p className="mb-2 text-label font-bold uppercase tracking-widest text-muted-foreground">
              Toutes les options{service === 'LIVRAISON' ? ' · envoi de colis' : ''}
            </p>
            <div
              key={liveKm === null ? 'estimee' : 'affinee'}
              className="apparait flex flex-col gap-2.5"
            >
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
                          className="-mb-1 flex basis-full items-center gap-1.5 text-tiny font-bold uppercase tracking-widest"
                          style={{ color: WARN }}
                        >
                          <span aria-hidden="true">★</span> Recommandé ·{' '}
                          {CRITERIA.find((c) => c.code === criterion)?.label}
                        </span>
                      )}
                      <ModeChip mode={r.option.mode} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-emph font-bold">
                          <span
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-label font-extrabold tabular-nums"
                            style={
                              winner
                                ? { backgroundColor: AMBER, color: COULEURS.ink }
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
                        <span className="text-note text-muted-foreground">{m.note}</span>
                        <Badges codes={codes} />
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-2xl font-extrabold tabular-nums leading-none">
                          {price !== null ? fmt(price) : '—'}
                        </span>
                        <span className="text-tiny font-semibold text-muted-foreground">FCFA</span>
                        <span className="mt-0.5 block text-sm font-bold tabular-nums text-foreground/80">
                          {minTotal(r.option)} min
                        </span>
                        {r.option.waitSeconds ? (
                          <span className="block text-tiny tabular-nums text-muted-foreground">
                            dont {Math.round(r.option.waitSeconds / 60)} d’attente
                          </span>
                        ) : null}
                      </span>
                      <Chevron />
                      {winner && insight && (
                        <span className="-mt-1 block basis-full text-note font-bold leading-snug text-brand-olive">
                          {insight}
                        </span>
                      )}
                      {(() => {
                        const ops = operators?.filter((op) => op.mode === r.option.mode) ?? [];
                        const agg = observed?.[r.option.mode];
                        const releves = agg && agg.count > 0 ? agg : null;
                        if (ops.length === 0 && !releves) return null;
                        return (
                          <span className="apparait -mt-1 flex basis-full flex-wrap items-center gap-1.5 border-t pt-1.5">
                            {ops.length > 0 && <OperatorChips ops={ops} />}
                            {releves && (
                              <span
                                title="Prix réellement payés, déposés par des usagers puis modérés"
                                className="inline-flex items-center gap-1 rounded-full bg-brand-olive/10 px-2 py-0.5 text-tiny font-bold tabular-nums text-brand-olive"
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

            {/* Lignes cartographiées — pour les personnes (pas de donnée colis) */}
            {service === 'COURSE' &&
              transit &&
              (transit.lignes.length > 0 || transit.correspondances.length > 0) && (
                <div className="apparait mt-4 rounded-2xl border bg-card p-4">
                  <p className="text-label font-bold uppercase tracking-widest text-muted-foreground">
                    {transit.lignes.length > 0
                      ? '🚌 Lignes utiles pour ce trajet'
                      : 'Pas de ligne directe — avec une correspondance'}
                  </p>
                  {(() => {
                    // Le serveur trie déjà par marche totale : la première ligne
                    // EST la meilleure — on le dit, au lieu de laisser analyser.
                    const meilleure = transit.lignes[0];
                    const marche = meilleure ? totalWalkM(meilleure) : null;
                    const visibles = showAllLines ? transit.lignes : transit.lignes.slice(0, 3);
                    return (
                      <>
                        {meilleure && marche !== null && transit.lignes.length > 1 && (
                          <p className="mt-2 text-note font-bold leading-snug text-brand-olive">
                            ★ Meilleure ligne :{' '}
                            {LIGNE_META[meilleure.mode]?.label ?? meilleure.mode}
                            {meilleure.ref ? ` ${meilleure.ref}` : ''} — seulement {fmtWalk(marche)}{' '}
                            de marche au total.
                          </p>
                        )}
                        <ul className="mt-2 space-y-2.5">
                          {visibles.map((l, i) => {
                            const montee = fmtWalk(l.montee_m);
                            const descente = fmtWalk(l.descente_m);
                            const best = i === 0 && marche !== null && transit.lignes.length > 1;
                            const tracable = typeof l.id === 'number';
                            const active = tracable && traceSel?.key === `l:${l.id}`;
                            return (
                              <li key={`${l.mode}-${l.nom}`} className="text-body">
                                <button
                                  type="button"
                                  onClick={() => toggleTrace(l)}
                                  disabled={!tracable}
                                  aria-pressed={active}
                                  className={
                                    '-mx-2 w-full rounded-xl px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                                    (active
                                      ? 'bg-trace-1/10 ring-1 ring-trace-1/40'
                                      : best
                                        ? 'bg-brand-olive/8 ring-1 ring-brand-olive/25'
                                        : tracable
                                          ? 'hover:bg-muted/40'
                                          : 'cursor-default')
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-tiny font-bold">
                                      {LIGNE_META[l.mode]?.emoji ?? '🚏'}{' '}
                                      {LIGNE_META[l.mode]?.label ?? l.mode}
                                      {l.ref ? ` ${l.ref}` : ''}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                      {cleanLineName(l.nom)}
                                    </span>
                                    {tracable && <Chevron />}
                                  </div>
                                  {montee && descente && (
                                    <p className="mt-0.5 text-label tabular-nums text-muted-foreground">
                                      🚶 {montee} au départ · {descente} à l’arrivée
                                    </p>
                                  )}
                                  {active && (
                                    <p className="mt-0.5 text-label font-semibold text-trace-1">
                                      {traceLayers
                                        ? 'Tracé affiché sur la carte ↓ (toucher pour retirer)'
                                        : 'Chargement du tracé…'}
                                    </p>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        {transit.lignes.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllLines((v) => !v)}
                            className="mt-2 text-note font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {showAllLines
                              ? 'Réduire ↑'
                              : `Voir les ${transit.lignes.length} lignes ↓`}
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {transit.correspondances.length > 0 && (
                    <>
                      {transit.lignes.length > 0 && (
                        <p className="mt-3 text-tiny font-bold uppercase tracking-wider text-muted-foreground">
                          Ou avec une correspondance
                        </p>
                      )}
                      <ul className="mt-1.5 space-y-2.5">
                        {transit.correspondances.slice(0, 3).map((c) => {
                          const tracable =
                            typeof c.ligne1_id === 'number' && typeof c.ligne2_id === 'number';
                          const active =
                            tracable && traceSel?.key === `c:${c.ligne1_id}:${c.ligne2_id}`;
                          return (
                            <li key={`${c.ligne1}__${c.ligne2}`} className="text-body">
                              <button
                                type="button"
                                onClick={() => toggleCorrTrace(c)}
                                disabled={!tracable}
                                aria-pressed={active}
                                className={
                                  '-mx-2 w-full rounded-xl px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                                  (active
                                    ? 'bg-trace-1/10 ring-1 ring-trace-1/40'
                                    : tracable
                                      ? 'hover:bg-muted/40'
                                      : 'cursor-default')
                                }
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-tiny font-bold">
                                    {LIGNE_META[c.mode1]?.emoji ?? '🚏'}{' '}
                                    {LIGNE_META[c.mode1]?.label ?? c.mode1}
                                    {c.ref1 ? ` ${c.ref1}` : ''}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-medium">
                                    {cleanLineName(c.ligne1)}
                                  </span>
                                  {tracable && <Chevron />}
                                </div>
                                <div className="mt-0.5 flex items-baseline gap-1.5">
                                  <span aria-hidden="true" className="pl-2 text-muted-foreground">
                                    ↳
                                  </span>
                                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-tiny font-bold">
                                    {LIGNE_META[c.mode2]?.emoji ?? '🚏'}{' '}
                                    {LIGNE_META[c.mode2]?.label ?? c.mode2}
                                    {c.ref2 ? ` ${c.ref2}` : ''}
                                  </span>
                                  <span className="min-w-0 truncate font-medium">
                                    {cleanLineName(c.ligne2)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-label tabular-nums text-muted-foreground">
                                  🚶 montée {fmtWalk(c.montee_m)} · changement{' '}
                                  {c.gare ? (
                                    <>
                                      à <b className="text-foreground/80">{c.gare}</b>
                                      {c.correspondance_m >= 40
                                        ? ` (${fmtWalk(c.correspondance_m)})`
                                        : ''}
                                    </>
                                  ) : c.correspondance_m < 40 ? (
                                    'au même endroit'
                                  ) : (
                                    fmtWalk(c.correspondance_m)
                                  )}{' '}
                                  · descente {fmtWalk(c.descente_m)}
                                </p>
                                {active && (
                                  <p className="mt-0.5 text-label font-semibold text-trace-1">
                                    {traceLayers
                                      ? 'Tracés affichés sur la carte ↓ (toucher pour retirer)'
                                      : 'Chargement des tracés…'}
                                  </p>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  <p className="mt-2.5 text-tiny leading-snug text-muted-foreground">
                    D’après le réseau cartographié <b>OpenStreetMap</b> — lignes et tracés réels ·
                    horaires et tarifs non disponibles.
                  </p>
                </div>
              )}

            {cmp.ranking.excluded.map((e) => (
              <div
                key={e.option.optionId}
                className="mt-2.5 rounded-2xl border border-dashed bg-muted/40 p-4 text-note text-muted-foreground"
              >
                <b>{MODE_META[e.option.mode].label}</b> — non classé : {e.explanation}
              </div>
            ))}

            {/* La carte JUSTE sous les lignes : c'est elle qui les explique. */}
            {fromCommune && toCommune && (
              <>
                <figure ref={mapFigureRef} className="mt-4 overflow-hidden rounded-2xl border">
                  <StreetMap
                    from={fromCommune}
                    to={toCommune}
                    traces={traceLayers}
                    changePoint={changePoint}
                  />
                  <figcaption className="bg-card px-3 py-1.5 text-tiny text-muted-foreground">
                    {traceSel && traceLayers ? (
                      <>
                        <span className="font-bold text-trace-1">— {traceSel.label}</span> · fond ©
                        OpenStreetMap
                      </>
                    ) : (
                      'Fond © OpenStreetMap · tracé indicatif'
                    )}
                  </figcaption>
                </figure>
                {/* Navigation externe — au choix de l'usager (la destination est transmise à l'app choisie) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted-foreground">
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

            {/* La donnée terrain vaut plus qu'un partage : elle a SON bloc. */}
            {bothLieux && (
              <div className="mt-4 rounded-2xl border bg-card p-4">
                <p className="text-emph font-extrabold">Vous avez fait ce trajet ?</p>
                <p className="mt-0.5 text-note text-muted-foreground">
                  Aidez à rendre les prix plus fiables — anonyme, modéré avant publication.
                </p>
                <Button className="mt-3 w-full" onClick={() => allerA('contribuer')}>
                  + Ajouter le prix que j’ai payé
                </Button>
              </div>
            )}

            {/* Partage social : utile, mais secondaire — une ligne discrète. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-note text-muted-foreground">
              <span className="font-semibold">Partager ce trajet :</span>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="font-semibold text-[#128C4A] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={shareFacebook}
                className="font-semibold text-[#1877F2] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={share}
                className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                🔗 Copier le lien
              </button>
            </div>

            <div className="mt-3">
              <AdSlot slotId="resultats" />
            </div>

            <details className="group mt-3 rounded-xl border bg-card">
              <summary className="cursor-pointer select-none px-4 py-3 text-body font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
                ⓘ Comprendre ces chiffres — exemples, observations, neutralité
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <ConfidenceNote />
                {obsCounts && obsCounts.total > 0 && (
                  <p className="flex items-start gap-1.5 text-label font-medium leading-snug text-brand-olive">
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
                  <p className="text-label text-muted-foreground">
                    Valeur du temps : {cmp.timeValueXofPerMinute} FCFA/min (exemple).
                  </p>
                )}
                <p className="text-label leading-snug text-muted-foreground">
                  Ordre d’affichage : les VTC d’abord. Les badges « moins cher / plus rapide /
                  meilleur rapport » restent calculés de façon <b>neutre</b> sur tous les modes —
                  aucun opérateur ne peut acheter sa place.
                </p>
                <Link
                  to="/methode#faq"
                  className="inline-block text-note font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Toutes les questions fréquentes →
                </Link>
              </div>
            </details>

            {/* L'installation tout en bas : d'abord prouver l'utilité, ensuite s'inviter. */}
            <InstallPrompt />

            <Button variant="ghost" size="sm" className="mt-1" onClick={() => allerA('recherche')}>
              ← Changer de trajet
            </Button>
          </section>
        )}

        {view === 'contribute' && cmp && (
          <ContributeView comparison={cmp} fromId={fromId} toId={toId} onBack={retourResultats} />
        )}

        {view === 'detail' && cmp && optionId && (
          <DetailView
            comparison={cmp}
            optionId={optionId}
            badgesByOption={badgesByOption}
            criterion={criterion}
            observed={observed}
            operators={operators}
            onBack={retourResultats}
          />
        )}

        {/* Jamais de page blanche : si la comparaison est impossible, on le
            dit et on ramène vers la recherche (absence honnête, pas muette). */}
        {view !== 'search' && !cmp && (
          <section aria-label="Comparaison impossible" className="py-12 text-center">
            <p className="text-lg font-extrabold">Impossible de comparer ce trajet.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Vérifiez le départ et l’arrivée — il faut deux lieux différents, dans la zone
              d’Abidjan.
            </p>
            <Button className="mt-5" onClick={() => allerA('recherche')}>
              ← Modifier le trajet
            </Button>
          </section>
        )}
      </main>
      {sheet && (
        <PlaceSheet
          label={
            sheet === 'from'
              ? service === 'LIVRAISON'
                ? 'Enlèvement'
                : 'Départ'
              : service === 'LIVRAISON'
                ? 'Livraison'
                : 'Arrivée'
          }
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
    </>
  );
}
