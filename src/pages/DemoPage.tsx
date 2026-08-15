import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import {
  CORRIDORS,
  CRITERIA,
  getComparison,
  MODE_META,
  type DemoComparison,
  type DemoCriterion,
  type DemoMode,
} from '@/demo/scenario';
import { PRODUCT } from '@/config/product';
import { SIMULATION_BANNER } from '@/demo/simulation';
import type { BadgeCode, RankableOption } from '@/domain/ranking';

const XOF = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => XOF.format(n);
const km1 = (n: number) => n.toFixed(1).replace('.', ',');

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

const AMBER = '#E8920A';
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
      <div className="bg-[#0B1518] text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="inline-flex items-center gap-2 text-base font-extrabold tracking-tight">
            <svg viewBox="0 0 48 48" className="h-5 w-5" fill="none" aria-hidden="true">
              <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <line x1="24" y1="4" x2="24" y2="17" />
                <line x1="41.3" y1="14" x2="30.5" y2="20.5" />
                <line x1="41.3" y1="34" x2="30.5" y2="27.5" />
                <line x1="24" y1="44" x2="24" y2="31" />
                <line x1="6.7" y1="34" x2="17.5" y2="27.5" />
                <line x1="6.7" y1="14" x2="17.5" y2="20.5" />
              </g>
              <circle cx="24" cy="24" r="4.2" fill={AMBER} />
            </svg>
            {PRODUCT.displayName}
          </span>
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Quitter
          </Link>
        </div>
      </div>
      <div
        className="flex items-center justify-center gap-2 px-3 py-1.5 text-center text-[11px] font-bold tracking-wide text-white"
        style={{ backgroundColor: WARN }}
        role="alert"
      >
        <span aria-hidden="true">●</span> {SIMULATION_BANNER} <span aria-hidden="true">●</span>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [section, setSection] = useState<Section>('app');
  const [corridorId, setCorridorId] = useState<string>(CORRIDORS[0]!.id);
  const [criterion, setCriterion] = useState<DemoCriterion>('PRICE_TIME');
  const [view, setView] = useState<View>('search');
  const [optionId, setOptionId] = useState<string | null>(null);

  const cmp: DemoComparison | null = useMemo(
    () => getComparison(corridorId, criterion),
    [corridorId, criterion],
  );

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
            <h1 className="mb-1 mt-1 text-2xl font-extrabold tracking-tight">
              Choisissez un trajet
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">
              8 corridors d&apos;exemple à Abidjan — fictifs.
            </p>
            <div className="flex flex-col gap-2">
              {CORRIDORS.map((c) => {
                const active = c.id === corridorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCorridorId(c.id)}
                    className={
                      'flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                      (active ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground/30')
                    }
                  >
                    <RouteDots />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {c.from} → {c.to}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      ≈ {km1(c.km)} km
                    </span>
                  </button>
                );
              })}
            </div>
            <Button className="mt-5 h-12 w-full text-base" onClick={() => setView('results')}>
              Comparer les modes →
            </Button>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Lieux et distances sont des <b style={{ color: WARN }}>exemples</b>. Le trajet réel
              dépendra du routage OSRM (non encore disponible — DEP-001).
            </p>
          </section>
        )}

        {section === 'app' && view === 'results' && cmp && (
          <section aria-label="Résultats">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Étape 2 · Comparaison
            </p>
            <div className="mb-4 mt-1 flex items-baseline justify-between gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {cmp.corridor.from} → {cmp.corridor.to}
              </h1>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                ≈ {km1(cmp.corridor.km)} km · {cmp.options.length} modes
              </span>
            </div>

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
                  onClick={() => setCriterion(cr.code)}
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
                              ? { backgroundColor: AMBER, color: '#0B1518' }
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

            <Button variant="outline" className="mt-5 w-full" onClick={() => setView('contribute')}>
              + Contribuer un tarif (simulation)
            </Button>

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
          <ContributeView comparison={cmp} onBack={() => setView('results')} />
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
    </div>
  );
}

/** Petit repère visuel origine → destination. */
function RouteDots() {
  return (
    <svg viewBox="0 0 12 24" className="h-9 w-3 shrink-0" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line
        x1="6"
        y1="8"
        x2="6"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="1.5 2"
      />
      <path
        d="M6 22c2.2-3 3.4-4.6 3.4-6.2A3.4 3.4 0 0 0 6 12.4a3.4 3.4 0 0 0-3.4 3.4C2.6 17.4 3.8 19 6 22z"
        fill={AMBER}
      />
    </svg>
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
      </dl>

      {trace && (
        <>
          <Separator className="my-4" />
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Trace du calcul (invariant I2)
          </div>
          <div
            className="mt-2 overflow-x-auto rounded-xl p-4 font-mono text-[11.5px] leading-relaxed"
            style={{ backgroundColor: '#0E1B1F', color: '#cfe' }}
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
  onBack,
}: {
  comparison: DemoComparison;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<DemoMode>(cmp.options[0]!.mode);
  const [price, setPrice] = useState<string>('');

  function submit() {
    toast('Simulation — rien n’a été enregistré', {
      description: `Dans le produit réel, votre relevé (${MODE_META[mode].label}${
        price ? ` · ${price} FCFA` : ''
      }) ferait monter l’indice de confiance de ce tarif (actuellement 0).`,
    });
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
        Contribuer un tarif · simulation
      </p>
      <h2 className="mb-1 mt-1 text-xl font-extrabold">
        {cmp.corridor.from} → {cmp.corridor.to}
      </h2>
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Illustration du futur fonctionnement collaboratif : les usagers relèvent les prix réellement
        payés, ce qui fait monter l’indice de confiance.{' '}
        <b style={{ color: WARN }}>Aucune donnée n’est enregistrée ici.</b>
      </p>

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

      <Button className="h-11 w-full" onClick={submit}>
        Envoyer (simulation)
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Un vrai envoi passerait par une file modérée, avec masquage des données personnelles et
        recalage de l’indice de confiance.
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
