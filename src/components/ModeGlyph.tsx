import type { ReactNode } from 'react';

/**
 * Pictogrammes de mode — présentationnels et neutres (trait `currentColor`).
 * Partagés par la vitrine et la démonstration pour une identité cohérente.
 * Aucune marque d'opérateur : ce sont des silhouettes génériques.
 */
export type GlyphShape = 'vtc' | 'taxi' | 'woro' | 'gbaka';

const PATHS: Record<GlyphShape, ReactNode> = {
  vtc: (
    <>
      <path d="M5 16l1.5-4.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 16" />
      <path d="M4 16h16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <circle cx="7.5" cy="16" r="0.5" />
      <circle cx="16.5" cy="16" r="0.5" />
    </>
  ),
  taxi: (
    <>
      <path d="M5 16l1.5-4.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 16" />
      <path d="M4 16h16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <rect x="9.5" y="6.5" width="5" height="2.2" rx="0.5" />
    </>
  ),
  woro: (
    <>
      <rect x="4" y="8" width="16" height="8" rx="1.5" />
      <path d="M4 12h16M12 8v8" />
      <path d="M5 18v-1M19 18v-1" />
    </>
  ),
  gbaka: (
    <>
      <rect x="4" y="6" width="16" height="10" rx="1.5" />
      <path d="M4 12h16" />
      <path d="M7 9h4M13 9h4" />
      <path d="M6 18v-2M18 18v-2" />
    </>
  ),
};

export function ModeGlyph({
  shape,
  className = 'h-6 w-6',
}: {
  shape: GlyphShape;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[shape]}
    </svg>
  );
}
