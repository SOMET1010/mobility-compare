/**
 * Couleurs de marque côté JavaScript — styles inline, Leaflet, SVG
 * dynamiques. MÊMES valeurs que `tailwind.config.ts` (brand/warn/trace) :
 * l'un ne bouge pas sans l'autre. Dans les className, on utilise les
 * classes nommées (bg-brand-ochre…), jamais un hex (audit UX C4).
 */
export const COULEURS = {
  ink: '#26301C',
  paper: '#F3EEDF',
  olive: '#5C6B2E',
  ochre: '#B9722A',
  sprout: '#C3D18F',
  warn: '#9A3412',
  trace1: '#1E5AA8',
  trace2: '#7C3AED',
} as const;
