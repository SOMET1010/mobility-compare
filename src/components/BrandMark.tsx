import { PRODUCT } from '@/config/product';

/**
 * Marque provisoire « Voies qui convergent » (variante A) — source unique.
 * Le point central est « Soleil » #B9722A ; le trait suit `currentColor`.
 */
export function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      {/* Soleil / « voies qui convergent » : 8 rayons vers un point de décision. */}
      <g stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <line x1="24" y1="4" x2="24" y2="17" />
        <line x1="24" y1="44" x2="24" y2="31" />
        <line x1="4" y1="24" x2="17" y2="24" />
        <line x1="44" y1="24" x2="31" y2="24" />
        <line x1="9.9" y1="9.9" x2="19.1" y2="19.1" />
        <line x1="38.1" y1="38.1" x2="28.9" y2="28.9" />
        <line x1="38.1" y1="9.9" x2="28.9" y2="19.1" />
        <line x1="9.9" y1="38.1" x2="19.1" y2="28.9" />
      </g>
      <circle cx="24" cy="24" r="4.4" fill="#B9722A" />
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
