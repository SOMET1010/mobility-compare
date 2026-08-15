import { PRODUCT } from '@/config/product';

/**
 * Marque provisoire « Voies qui convergent » (variante A) — source unique.
 * Le point central est « Soleil » #B9722A ; le trait suit `currentColor`.
 */
export function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <line x1="24" y1="4" x2="24" y2="17" />
        <line x1="41.3" y1="14" x2="30.5" y2="20.5" />
        <line x1="41.3" y1="34" x2="30.5" y2="27.5" />
        <line x1="24" y1="44" x2="24" y2="31" />
        <line x1="6.7" y1="34" x2="17.5" y2="27.5" />
        <line x1="6.7" y1="14" x2="17.5" y2="20.5" />
      </g>
      <circle cx="24" cy="24" r="4.2" fill="#B9722A" />
    </svg>
  );
}

/** Logotype : marque + nom affiché. `testId` pose le repère de test produit. */
export function Wordmark({
  className = '',
  testId = false,
}: {
  className?: string;
  testId?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}
      {...(testId ? { 'data-testid': 'product-name' } : {})}
    >
      <BrandMark className="h-[0.9em] w-[0.9em]" />
      {PRODUCT.displayName}
    </span>
  );
}
