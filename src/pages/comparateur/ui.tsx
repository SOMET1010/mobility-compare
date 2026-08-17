import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import { COULEURS } from '@/config/couleurs';
import {
  CRITERIA,
  MODE_META,
  type DemoCriterion,
  type DemoMode,
  type ServiceType,
} from '@/demo/scenario';
import type { Operator } from '@/features/operators/operators';
import type { BadgeCode, RankableOption } from '@/domain/ranking';

/**
 * Socle partagé des écrans du comparateur — formats, pastilles et
 * primitives visuelles, extraits de DemoPage (audit UX C10 : 1 762 lignes
 * dans un seul fichier). Une définition, plusieurs vues.
 */

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

export {
  SERVICES,
  SERVICE_OPTS,
  CRIT_OPTS,
  XOF,
  fmt,
  approx50,
  km1,
  fmtCo2,
  BADGE_LABEL,
  minTotal,
  CRIT_TAB,
  LIGNE_META,
  GLYPH,
  fareAmount,
  CRIT_BADGE,
  HEADLINE,
  AMBER,
  WARN,
  TRACE1,
  TRACE2,
  ModeChip,
  Chevron,
  Badges,
  OperatorChips,
  ConfidenceNote,
};
