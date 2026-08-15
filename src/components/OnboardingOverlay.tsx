import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ModeGlyph } from '@/components/ModeGlyph';

/**
 * Onboarding en 3 écrans, affiché à la première visite du comparateur.
 * Aucune promesse gonflée : chaque écran dit ce que le produit fait vraiment,
 * y compris son statut de démonstration.
 */

interface Slide {
  readonly title: string;
  readonly body: string;
  readonly art: 'modes' | 'shield' | 'demo';
}

const SLIDES: readonly Slide[] = [
  {
    title: 'Tous vos trajets, sur un même écran',
    body: 'MOBILIS compare d’abord les VTC — puis le taxi compteur, le woro-woro et le gbaka — prix, durée et meilleur compromis d’un même trajet à Abidjan.',
    art: 'modes',
  },
  {
    title: 'Un classement neutre, prouvé',
    body: 'Aucun sponsor, aucune commission : le classement ne connaît que vos critères. Chaque prix montre son calcul, étape par étape.',
    art: 'shield',
  },
  {
    title: 'Aujourd’hui : démonstration',
    body: 'Les prix et durées sont simulés, en attendant les grilles officielles et les relevés de terrain. Tout ce qui est estimé est étiqueté.',
    art: 'demo',
  },
];

function Art({ kind }: { kind: Slide['art'] }) {
  if (kind === 'modes') {
    return (
      <div className="flex items-center justify-center gap-3">
        {(['vtc', 'taxi', 'woro', 'gbaka'] as const).map((m, i) => (
          <span
            key={m}
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              color: i % 2 ? '#B9722A' : '#5C6B2E',
              backgroundColor: `color-mix(in oklab, ${i % 2 ? '#B9722A' : '#5C6B2E'} 14%, transparent)`,
            }}
          >
            <ModeGlyph shape={m} className="h-8 w-8" />
          </span>
        ))}
      </div>
    );
  }
  if (kind === 'shield') {
    return (
      <div className="flex items-center justify-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-[#5C6B2E]/12 text-[#5C6B2E]">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-[#B9722A]/12">
        <BrandMark className="h-10 w-10 text-[#B9722A]" />
      </span>
    </div>
  );
}

export function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step]!;
  const last = step === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur MOBILIS"
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-[#26301C]/60 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 shadow-2xl sm:rounded-3xl sm:pb-6">
        <div className="mb-6 mt-2">
          <Art kind={slide.art} />
        </div>
        <h2 className="text-center text-xl font-extrabold tracking-tight">{slide.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          {slide.body}
        </p>

        {/* Points d'étape */}
        <div className="mt-5 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-[#B9722A]' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {!last && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Passer
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? onDone() : setStep((s) => s + 1))}
            className="flex-1 rounded-xl bg-[#B9722A] px-6 py-3 text-base font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9722A] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-95"
          >
            {last ? 'C’est parti →' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
}
