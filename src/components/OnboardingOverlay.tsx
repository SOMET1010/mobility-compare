import { ModeGlyph } from '@/components/ModeGlyph';

/**
 * Accueil de première visite — UN SEUL écran, trois points, un bouton.
 * Le produit répond, il ne fait pas la leçon : l'usager doit pouvoir comparer
 * en un geste. Aucune promesse gonflée, le statut pilote est dit simplement.
 */

const POINTS: { icon: 'route' | 'shield' | 'seed'; text: string }[] = [
  { icon: 'route', text: 'VTC, taxi compteur, woro-woro et gbaka comparés sur votre trajet.' },
  { icon: 'shield', text: 'Classement neutre : personne ne peut acheter sa place.' },
  { icon: 'seed', text: 'Prix indicatifs pour l’instant — confirmés peu à peu sur le terrain.' },
];

const ICONS: Record<(typeof POINTS)[number]['icon'], JSX.Element> = {
  route: (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
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
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  seed: (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21V11M12 11c0-4 3-7 8-7-1 5-4 7-8 7zM12 13c0-3-2.5-5-6-5 .8 3.6 3 5 6 5z" />
    </svg>
  ),
};

export function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur MOBILIS"
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-[#26301C]/60 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 shadow-2xl sm:rounded-3xl sm:pb-6">
        <div className="mb-5 mt-1 flex items-center justify-center gap-3">
          {(['vtc', 'taxi', 'woro', 'gbaka'] as const).map((m, i) => (
            <span
              key={m}
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{
                color: i % 2 ? '#B9722A' : '#5C6B2E',
                backgroundColor: `color-mix(in oklab, ${i % 2 ? '#B9722A' : '#5C6B2E'} 14%, transparent)`,
              }}
            >
              <ModeGlyph shape={m} className="h-7 w-7" />
            </span>
          ))}
        </div>
        <h2 className="text-center text-xl font-extrabold tracking-tight">
          On va où ? MOBILIS compare pour vous.
        </h2>
        <ul className="mx-auto mt-4 max-w-sm space-y-2.5">
          {POINTS.map((p) => (
            <li key={p.icon} className="flex items-start gap-2.5 text-sm leading-snug">
              <span className="mt-0.5 shrink-0 text-[#5C6B2E]">{ICONS[p.icon]}</span>
              <span className="text-muted-foreground">{p.text}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-xl bg-[#B9722A] px-6 py-3 text-base font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9722A] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-95"
        >
          C’est parti →
        </button>
      </div>
    </div>
  );
}
