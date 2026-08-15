import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

function fareAmount(o: RankableOption): number | null {
  return o.fare.available ? o.fare.value.amount : null;
}

/** Bandeau permanent — présent sur chaque écran. */
function SimBanner() {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-center gap-2 px-3 py-2 text-center text-[12px] font-bold tracking-wide"
      style={{ backgroundColor: '#9A3412', color: '#fff' }}
      role="alert"
    >
      <span aria-hidden="true">●</span> {SIMULATION_BANNER} <span aria-hidden="true">●</span>
    </div>
  );
}

function ModeIcon({ mode, size = 40 }: { mode: DemoMode; size?: number }) {
  const m = MODE_META[mode];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl text-white"
      style={{ backgroundColor: m.color, width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {m.emoji}
    </span>
  );
}

function Badges({ codes }: { codes: BadgeCode[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {codes.map((c) => (
        <span
          key={c}
          className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary"
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
      className="my-2 rounded-lg border border-dashed px-3 py-2 text-[11px] font-medium"
      style={{
        borderColor: '#c2410c',
        color: '#9A3412',
        backgroundColor: 'color-mix(in oklab, #9A3412 8%, transparent)',
      }}
    >
      ⚠︎ Prix &amp; durées : exemples. Indice de confiance terrain : 0 (aucune observation réelle —
      DEP-004).
    </div>
  );
}

type Section = 'app' | 'realvs' | 'about';
type View = 'search' | 'results' | 'detail' | 'contribute';

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
      <SimBanner />
      <main className="mx-auto w-full max-w-md p-4">
        <header className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold tracking-tight">{PRODUCT.displayName}</div>
            <div className="text-[11px] text-muted-foreground">Démonstration · Abidjan</div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Quitter</Link>
          </Button>
        </header>

        {/* Navigation de sections */}
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {navItems.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setSection(n.key)}
              aria-pressed={section === n.key}
              className={
                'rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
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
            <h1 className="mb-3 text-balance text-xl font-extrabold">Choisissez un trajet</h1>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              8 corridors d&apos;exemple (fictifs)
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
                    className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={
                      active
                        ? {
                            borderColor: 'hsl(var(--primary))',
                            boxShadow: 'inset 0 0 0 1px hsl(var(--primary))',
                          }
                        : undefined
                    }
                  >
                    <span className="text-sm font-bold">
                      {c.from} → {c.to}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      ≈ {km1(c.km)} km
                    </span>
                  </button>
                );
              })}
            </div>
            <Button className="mt-4 w-full" onClick={() => setView('results')}>
              Comparer les modes →
            </Button>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Lieux et distances sont des <b style={{ color: '#9A3412' }}>exemples</b>. Le trajet
              réel dépendra du routage OSRM (non encore disponible — DEP-001).
            </p>
          </section>
        )}

        {section === 'app' && view === 'results' && cmp && (
          <section aria-label="Résultats">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Étape 2 · Comparaison
            </p>
            <div className="flex items-center gap-2 text-sm font-bold">
              {cmp.corridor.from} → {cmp.corridor.to}
            </div>
            <div className="mb-2 text-[11px] tabular-nums text-muted-foreground">
              ≈ {km1(cmp.corridor.km)} km · {cmp.options.length} modes
            </div>

            {/* Sélecteur de critère */}
            <div
              className="mb-2 flex gap-1 rounded-xl bg-muted p-1"
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
                    'flex-1 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
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
              <p className="mb-1 text-[10.5px] text-muted-foreground">
                Valeur du temps : {cmp.timeValueXofPerMinute} FCFA/min (exemple).
              </p>
            )}
            <ConfidenceNote />

            {/* Pourquoi le n°1 */}
            {cmp.ranking.ranked[0] && (
              <div className="mb-3 rounded-xl border bg-card p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recommandé · pourquoi ?
                </div>
                <p className="mt-1 text-[13px]">
                  <b>{MODE_META[cmp.ranking.ranked[0].option.mode].label}</b> arrive 1<sup>er</sup>{' '}
                  sur « {CRITERIA.find((c) => c.code === criterion)?.label} » :{' '}
                  <span className="tabular-nums">{cmp.ranking.ranked[0].sortExplanation}</span>.
                </p>
              </div>
            )}

            {cmp.ranking.ranked.map((r) => {
              const price = fareAmount(r.option);
              const codes = badgesByOption.get(r.option.optionId) ?? [];
              const m = MODE_META[r.option.mode];
              return (
                <button
                  key={r.option.optionId}
                  type="button"
                  onClick={() => openDetail(r.option.optionId)}
                  className="mb-2 grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ModeIcon mode={r.option.mode} />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                        {r.position}
                      </span>
                      {m.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{m.note}</span>
                    <Badges codes={codes} />
                  </span>
                  <span className="text-right">
                    <span className="block text-[15px] font-extrabold tabular-nums">
                      {price !== null ? fmt(price) : '—'}{' '}
                      <span className="text-[10px] font-semibold text-muted-foreground">FCFA</span>
                    </span>
                    <span className="block text-[11px] tabular-nums text-muted-foreground">
                      {Math.round(r.option.durationSeconds! / 60)} min
                    </span>
                  </span>
                </button>
              );
            })}

            {cmp.ranking.excluded.map((e) => (
              <div
                key={e.option.optionId}
                className="mb-2 rounded-2xl border border-dashed bg-muted/40 p-3 text-[12px] text-muted-foreground"
              >
                <b>{MODE_META[e.option.mode].label}</b> — non classé : {e.explanation}
              </div>
            ))}

            <Button variant="outline" className="mt-2 w-full" onClick={() => setView('contribute')}>
              + Contribuer un tarif (simulation)
            </Button>

            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Badges « moins cher / plus rapide / meilleur rapport » calculés par un classement{' '}
              <b>neutre</b> — aucun levier commercial (invariant I3).
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setView('search')}>
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
        className="mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour à la comparaison
      </button>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Étape 3 · Résultat
      </p>

      <div className="my-2 flex items-center gap-3">
        <ModeIcon mode={o.mode} size={52} />
        <div>
          <div className="text-lg font-extrabold">{m.label}</div>
          <div className="text-[11px] text-muted-foreground">
            {m.note}
            {m.kind === 'FLAT' ? ' · tarif forfaitaire (modèle simplifié)' : ''}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xl font-extrabold tabular-nums">
            {price !== null ? fmt(price) : '—'}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground">FCFA · exemple</div>
        </div>
      </div>

      <ConfidenceNote />

      <div className="my-2 rounded-xl border bg-card p-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Pourquoi ce classement ?
        </div>
        <p className="mt-1 text-[13px]">
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
              <li key={b.code} className="text-[12px]">
                <b>{BADGE_LABEL[b.code]}</b> — {b.justification}
              </li>
            ))}
          </ul>
        )}
        {codes.length === 0 && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            Aucun badge : ce mode n’est premier sur aucun critère.
          </p>
        )}
      </div>

      <dl className="my-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-xl bg-muted/50 p-3 text-[13px]">
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
          <Separator className="my-3" />
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Trace du calcul (invariant I2)
          </div>
          <div
            className="mt-2 overflow-x-auto rounded-xl p-3 font-mono text-[11.5px] leading-relaxed"
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
            le nombre d’observations terrain. Ici, tout est{' '}
            <b style={{ color: '#9A3412' }}>simulé</b>.
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
        className="mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Retour à la comparaison
      </button>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Contribuer un tarif · simulation
      </p>
      <h2 className="mb-1 text-lg font-extrabold">
        {cmp.corridor.from} → {cmp.corridor.to}
      </h2>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Illustration du futur fonctionnement collaboratif : les usagers relèvent les prix réellement
        payés, ce qui fait monter l’indice de confiance.{' '}
        <b style={{ color: '#9A3412' }}>Aucune donnée n’est enregistrée ici.</b>
      </p>

      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Mode
      </label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {cmp.options.map((o) => (
          <button
            key={o.optionId}
            type="button"
            onClick={() => setMode(o.mode)}
            aria-pressed={mode === o.mode}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-sm font-semibold transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={
              mode === o.mode
                ? {
                    borderColor: 'hsl(var(--primary))',
                    boxShadow: 'inset 0 0 0 1px hsl(var(--primary))',
                  }
                : undefined
            }
          >
            <ModeIcon mode={o.mode} size={26} />
            {MODE_META[o.mode].label}
          </button>
        ))}
      </div>

      <label
        htmlFor="contrib-price"
        className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        Prix payé (FCFA)
      </label>
      <input
        id="contrib-price"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="ex. 350"
        className="mb-3 w-full rounded-xl border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <Button className="w-full" onClick={submit}>
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
      <h2 className="mb-1 text-lg font-extrabold">Ce que montre cette démonstration</h2>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Le <em>parcours</em> et la <em>mécanique de comparaison</em> sont réels. Seules les{' '}
        <em>valeurs</em> (lieux, distances, prix, durées) sont fictives.
      </p>
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border bg-card p-3">
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
            <li>✓ Socle testé — 241 tests, CI verte</li>
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <h3
            className="mb-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#9A3412' }}
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
      <div className="mt-3 rounded-xl bg-muted/50 p-3 text-[12.5px] text-muted-foreground">
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
      <h2 className="text-balance text-lg font-extrabold">
        Le premier moteur <span style={{ color: 'hsl(var(--primary))' }}>neutre</span> de
        comparaison des mobilités urbaines en Afrique
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Le comparateur n’est que la première fonctionnalité. La même plateforme pourra comparer tous
        les modes, sans levier commercial : le classement ignore structurellement l’existence d’un
        annonceur (invariant I3).
      </p>

      <div className="mt-3 rounded-xl border bg-card p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Aujourd’hui (démo)
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {today.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl border bg-card p-3">
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

      <div className="mt-3 rounded-xl border bg-card p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Plus tard (dimensions)
        </h3>
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {later.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl bg-muted/50 p-3 text-[12px] text-muted-foreground">
        <b className="text-foreground">Exigence de transparence.</b> Aucune donnée n’est inventée
        dans le produit : un prix sans observation terrain s’affiche comme non validé (confiance 0).
        Cette démonstration l’assume à chaque écran.
      </div>
    </section>
  );
}
