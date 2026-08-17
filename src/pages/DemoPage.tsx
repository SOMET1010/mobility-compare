import { useEffect, useMemo, useRef, useState } from 'react';
import { COULEURS } from '@/config/couleurs';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import { StreetMap, type TraceLayer } from '@/components/StreetMap';
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
import { SiteHeader } from '@/components/SiteHeader';
import { ConditionsBar } from '@/components/Conditions';
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
import type { BadgeCode, RankableOption } from '@/domain/ranking';

const XOF = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => XOF.format(n);
/** Arrondi au pas de 50 F — un prix estimé s'affiche « ≈ », jamais au franc près. */
const approx50 = (n: number) => Math.round(n / 50) * 50;
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
  MOTO: 'moto',
  TRICYCLE: 'tricycle',
  CARGO: 'cargo',
};

/** Les deux prestations comparées — mêmes moteurs, modes différents. */
const SERVICES: readonly { code: ServiceType; label: string }[] = [
  { code: 'COURSE', label: '🧍 Me déplacer' },
  { code: 'LIVRAISON', label: '📦 Envoyer un colis' },
];

/** Options prêtes pour le composant Segmented. */
const SERVICE_OPTS = SERVICES.map((s) => ({ value: s.code, label: s.label }));
const CRIT_OPTS = CRITERIA.map((c) => ({ value: c.code, label: CRIT_TAB[c.code] }));

function fareAmount(o: RankableOption): number | null {
  return o.fare.available ? o.fare.value.amount : null;
}

/** Le bénéfice avant l'algorithme : badge premier selon le critère courant. */
const CRIT_BADGE: Record<DemoCriterion, BadgeCode> = {
  PRICE: 'CHEAPEST',
  DURATION: 'FASTEST',
  PRICE_TIME: 'BEST_VALUE',
};
const HEADLINE: Record<BadgeCode, string> = {
  CHEAPEST: '💰 Le trajet le moins cher.',
  FASTEST: '⚡ Le trajet le plus rapide.',
  BEST_VALUE: '⭐ Le meilleur équilibre prix-durée.',
};

/* ---------------------------------------------------------------- primitives */

const AMBER = COULEURS.ochre;
const WARN = COULEURS.warn;
/** Couleurs des tracés de lignes sur la carte (étape 1 / étape 2). */
const TRACE1 = COULEURS.trace1;
const TRACE2 = COULEURS.trace2;

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
          className="rounded-full bg-primary/12 px-2 py-0.5 text-tiny font-bold uppercase tracking-wide text-primary"
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
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-tiny font-bold text-foreground"
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
              className="text-brand-olive"
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
      className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-note font-medium"
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
  const [service, setService] = useState<ServiceType>(
    params.get('quoi') === 'livraison' ? 'LIVRAISON' : 'COURSE',
  );
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

  /** Reflète le trajet dans l'URL (lien partageable / rechargeable). */
  function syncUrl(from: string, to: string, crit: DemoCriterion, svc: ServiceType = service) {
    setParams(
      { de: from, a: to, tri: crit, ...(svc === 'LIVRAISON' ? { quoi: 'livraison' } : {}) },
      { replace: true },
    );
  }

  function pickService(svc: ServiceType) {
    setService(svc);
    if (view === 'results' || view === 'detail') syncUrl(fromId, toId, criterion, svc);
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
        banner={<ConditionsBar pilote />}
      />
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
                  {favorites.map((t) => {
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
                  {recents.map((t) => {
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
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                ≈ {km1(cmp.corridor.km)} km
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
                          <span className="-mt-1 flex basis-full flex-wrap items-center gap-1.5 border-t pt-1.5">
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
                <div className="mt-4 rounded-2xl border bg-card p-4">
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
                <Button className="mt-3 w-full" onClick={() => setView('contribute')}>
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

        {/* Jamais de page blanche : si la comparaison est impossible, on le
            dit et on ramène vers la recherche (absence honnête, pas muette). */}
        {view !== 'search' && !cmp && (
          <section aria-label="Comparaison impossible" className="py-12 text-center">
            <p className="text-lg font-extrabold">Impossible de comparer ce trajet.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Vérifiez le départ et l’arrivée — il faut deux lieux différents, dans la zone
              d’Abidjan.
            </p>
            <Button className="mt-5" onClick={() => setView('search')}>
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
  // Option disparue (changement de service ou de trajet) : on le dit,
  // jamais un écran vide.
  if (!ranked)
    return (
      <section aria-label="Détail">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Retour aux résultats
        </button>
        <p className="mt-4 text-sm text-muted-foreground">
          Cette option n’est plus disponible pour ce trajet — revenez aux résultats.
        </p>
      </section>
    );
  const o = ranked.option;
  const agg = observed?.[o.mode];
  const modeOperators = operators?.filter((op) => op.mode === o.mode) ?? [];
  const m = MODE_META[o.mode];
  const price = fareAmount(o);
  const codes = badgesByOption.get(o.optionId) ?? [];
  const trace = o.fare.available ? o.fare.trace : null;
  const critLabel = CRITERIA.find((c) => c.code === criterion)?.label ?? '';

  // Le coût d'opportunité : ce mode comparé à la référence — le recommandé
  // du critère courant, ou le 2ᵉ si ce mode EST le recommandé. Jamais
  // inventé : calculé sur les options affichées, absent si prix manquant.
  const autres = cmp.ranking.ranked.filter(
    (r) => r.option.optionId !== o.optionId && fareAmount(r.option) !== null,
  );
  const refOpt = price !== null ? (autres[0] ?? null) : null;
  const refLabel = refOpt ? MODE_META[refOpt.option.mode].label : '';
  const dPrix = refOpt ? price! - fareAmount(refOpt.option)! : null;
  const dMin = refOpt ? minTotal(o) - minTotal(refOpt.option) : null;

  const primaryBadge = codes.includes(CRIT_BADGE[criterion])
    ? CRIT_BADGE[criterion]
    : (codes[0] ?? null);
  const waitMin = o.waitSeconds ? Math.round(o.waitSeconds / 60) : 0;

  let arbitrage: string | null = null;
  if (dPrix !== null && dMin !== null && refOpt) {
    if (dPrix > 0 && dMin < 0)
      arbitrage = `Vous payez ${fmt(dPrix)} F de plus pour gagner ~${-dMin} min.`;
    else if (dPrix < 0 && dMin > 0)
      arbitrage = `Vous économisez ${fmt(-dPrix)} F en acceptant ~${dMin} min de plus.`;
    else if (dPrix <= 0 && dMin <= 0)
      arbitrage = `Moins cher et au moins aussi rapide que ${refLabel} sur ce trajet.`;
    else arbitrage = `${refLabel} fait au moins aussi bien sur les deux critères pour ce trajet.`;
  }

  return (
    <section aria-label="Détail">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour aux résultats
      </button>

      <div className="my-3 flex items-center gap-3.5">
        <ModeChip mode={o.mode} size={56} />
        <div>
          <div className="text-xl font-extrabold">{m.label}</div>
          <div className="text-note text-muted-foreground">
            {m.note}
            {m.kind === 'FLAT' ? ' · tarif fixe' : ''}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-extrabold tabular-nums leading-none">
            {price !== null ? `≈ ${fmt(approx50(price))}` : '—'}
          </div>
          <div className="mt-1 text-tiny font-semibold text-muted-foreground">
            FCFA · prix indicatif
          </div>
        </div>
      </div>

      <div className="my-3 rounded-xl border bg-card p-4">
        <div className="text-label font-bold uppercase tracking-wider text-muted-foreground">
          Pourquoi choisir {m.label} ?
        </div>
        <p className="mt-1.5 text-sm font-bold">
          {primaryBadge
            ? HEADLINE[primaryBadge]
            : `${m.note.charAt(0).toUpperCase()}${m.note.slice(1)}.`}
        </p>
        <p className="mt-0.5 text-body text-muted-foreground">
          Environ {minTotal(o)} min porte-à-porte
          {waitMin ? `, dont ${waitMin} min d’attente` : ''}.
        </p>
        {refOpt && dPrix !== null && dMin !== null && (dPrix !== 0 || dMin !== 0) && (
          <div className="mt-3 border-t pt-2.5">
            <p className="text-label font-bold uppercase tracking-wider text-muted-foreground">
              Par rapport au {refLabel}
            </p>
            <div className="mt-1.5 flex gap-2">
              {dPrix !== 0 && (
                <span
                  className={
                    'rounded-lg px-2.5 py-1 text-body font-extrabold tabular-nums ' +
                    (dPrix < 0
                      ? 'bg-brand-olive/10 text-brand-olive'
                      : 'bg-muted text-foreground/80')
                  }
                >
                  {dPrix > 0 ? '+' : '−'} {fmt(Math.abs(dPrix))} F
                </span>
              )}
              {dMin !== 0 && (
                <span
                  className={
                    'rounded-lg px-2.5 py-1 text-body font-extrabold tabular-nums ' +
                    (dMin < 0
                      ? 'bg-brand-olive/10 text-brand-olive'
                      : 'bg-muted text-foreground/80')
                  }
                >
                  {dMin > 0 ? '+' : '−'} {Math.abs(dMin)} min
                </span>
              )}
            </div>
            {arbitrage && <p className="mt-1.5 text-note leading-snug">{arbitrage}</p>}
          </div>
        )}
        <p className="mt-2.5 text-tiny text-muted-foreground">
          {ranked.position}
          <sup>{ranked.position === 1 ? 'er' : 'e'}</sup> sur {cmp.ranking.ranked.length} pour «{' '}
          {critLabel} ».
        </p>
      </div>

      {/* Les trois chiffres qui comptent — scannables d'un pouce. */}
      <div className="my-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <div className="text-lg font-extrabold tabular-nums leading-tight">{minTotal(o)} min</div>
          <div className="mt-0.5 text-tiny font-semibold text-muted-foreground">
            porte-à-porte{waitMin ? ` · dont ${waitMin} d’attente` : ''}
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <div className="text-lg font-extrabold tabular-nums leading-tight">
            {km1(cmp.corridor.km)} km
          </div>
          <div className="mt-0.5 truncate text-tiny font-semibold text-muted-foreground">
            {cmp.corridor.from} → {cmp.corridor.to}
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <div className="text-lg font-extrabold tabular-nums leading-tight">
            ≈ {fmtCo2(estimateCo2Grams(o.mode, cmp.corridor.km))}
          </div>
          <div className="mt-0.5 text-tiny font-semibold text-muted-foreground">CO₂ estimé</div>
        </div>
      </div>
      {agg && agg.count > 0 && (
        <p className="my-2 text-note font-bold tabular-nums text-brand-olive">
          ✓ Prix réellement observé :{' '}
          {agg.medianXof !== null
            ? `~${fmt(agg.medianXof)} FCFA (${agg.count} relevés terrain)`
            : `${agg.count} relevé${agg.count > 1 ? 's' : ''} terrain (médiane dès 5)`}
        </p>
      )}

      {modeOperators.length > 0 && (
        <div className="my-3 rounded-xl border bg-card p-4">
          <div className="text-label font-bold uppercase tracking-wider text-muted-foreground">
            Disponible via
          </div>
          <ul className="mt-1 divide-y">
            {modeOperators.map((op) => {
              const contenu = (
                <>
                  <span className="flex items-center gap-2 font-semibold">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: op.brand_color ?? 'hsl(var(--muted-foreground))' }}
                    />
                    {op.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {op.agrement_status !== 'AGREE' && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-tiny font-bold uppercase tracking-wide text-muted-foreground">
                        {AGREMENT_LABEL[op.agrement_status]}
                      </span>
                    )}
                    {op.site_url && <Chevron />}
                  </span>
                </>
              );
              return (
                <li key={op.id}>
                  {op.site_url ? (
                    <a
                      href={op.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 py-2.5 text-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {contenu}
                    </a>
                  ) : (
                    <div className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      {contenu}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-tiny leading-snug text-muted-foreground">
            {modeOperators.every((op) => op.agrement_status === 'AGREE') && (
              <span className="font-bold text-brand-olive">✓ Plateformes agréées · </span>
            )}
            statut vérifié le{' '}
            {modeOperators[0]?.status_verified_at
              ? new Date(modeOperators[0].status_verified_at).toLocaleDateString('fr-FR')
              : '—'}{' '}
            ({modeOperators[0]?.status_source ?? 'source à renseigner'}) · aucune affiliation.
            L’agrément atteste le droit d’exercer — le prix affiché ne provient pas de ces
            plateformes.
          </p>
        </div>
      )}

      <p className="mt-3 text-label leading-snug" style={{ color: WARN }}>
        ⚠︎ Estimation pilote · prix non confirmé par relevé terrain.{' '}
        <Link to="/methode" className="font-semibold underline underline-offset-2">
          Comment sont calculées les estimations ?
        </Link>
      </p>

      {trace && (
        <>
          <Separator className="my-4" />
          <div className="text-label font-bold uppercase tracking-wider text-muted-foreground">
            Le calcul, ligne par ligne
          </div>
          <div
            className="mt-2 overflow-x-auto rounded-xl p-4 font-mono text-label leading-relaxed"
            style={{ backgroundColor: COULEURS.ink, color: '#cfe' }}
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
          <p className="mt-3 text-label leading-snug text-muted-foreground">
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
      toast.error('Indiquez le prix réellement payé', {
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
      toast.success('Merci ! Relevé transmis', {
        description: `${MODE_META[mode].label} · ${price} FCFA — en file de modération avant publication (aucune donnée personnelle transmise).`,
      });
    } else if (result.outcome === 'ERROR') {
      toast.error('Échec de l’envoi — rien n’a été enregistré', { description: result.message });
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
        ← Retour aux résultats
      </button>
      <p className="text-label font-bold uppercase tracking-widest text-muted-foreground">
        Partager un prix payé · {IS_BACKEND_CONFIGURED ? 'relevé réel' : 'simulation'}
      </p>
      <h2 className="mb-1 mt-1 text-xl font-extrabold">
        {cmp.corridor.from} → {cmp.corridor.to}
      </h2>
      {IS_BACKEND_CONFIGURED ? (
        <p className="mb-4 text-note text-muted-foreground">
          Votre relevé du prix <b>réellement payé</b> part en file de modération, puis fait monter
          l’indice de confiance de ce corridor. Anonyme par conception : ni nom, ni téléphone, ni
          position précise — seulement commune de départ, d’arrivée, mode et prix.
        </p>
      ) : (
        <p className="mb-4 text-note text-muted-foreground">
          Illustration du futur fonctionnement collaboratif : les usagers relèvent les prix
          réellement payés, ce qui fait monter l’indice de confiance.{' '}
          <b style={{ color: WARN }}>Aucune donnée n’est enregistrée ici.</b>
        </p>
      )}

      <label className="mb-1.5 block text-label font-bold uppercase tracking-wider text-muted-foreground">
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
        className="mb-1.5 block text-label font-bold uppercase tracking-wider text-muted-foreground"
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
      <p className="mt-2 text-label text-muted-foreground">
        {IS_BACKEND_CONFIGURED
          ? 'Chaque relevé est modéré avant publication (détection d’aberrations, CDC M4). Rien n’est publié brut.'
          : 'Un vrai envoi passerait par une file modérée, avec masquage des données personnelles et recalage de l’indice de confiance.'}
      </p>
    </section>
  );
}
