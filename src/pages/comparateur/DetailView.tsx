import { Link } from 'react-router-dom';
import { COULEURS } from '@/config/couleurs';
import { Separator } from '@/components/ui/separator';
import {
  CRITERIA,
  estimateCo2Grams,
  MODE_META,
  type DemoComparison,
  type DemoCriterion,
  type DemoMode,
} from '@/demo/scenario';
import { AGREMENT_LABEL, type Operator } from '@/features/operators/operators';
import type { ObservedAggregate } from '@/features/contributions/aggregate';
import type { BadgeCode } from '@/domain/ranking';
import {
  approx50,
  Chevron,
  CRIT_BADGE,
  fareAmount,
  fmt,
  fmtCo2,
  HEADLINE,
  km1,
  minTotal,
  ModeChip,
  WARN,
} from '@/pages/comparateur/ui';

export function DetailView({
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
