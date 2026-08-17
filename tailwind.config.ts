import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // Couleurs de MARQUE — la seule source. Les valeurs hex n'ont plus
        // le droit d'apparaître dans les className (audit UX C4).
        brand: {
          ink: '#26301C',
          paper: '#F3EEDF',
          olive: '#5C6B2E',
          ochre: '#B9722A',
          sprout: '#C3D18F',
        },
        warn: '#9A3412',
        trace: { 1: '#1E5AA8', 2: '#7C3AED' },
      },
      // Échelle typographique NOMMÉE — remplace les 12 tailles arbitraires
      // text-[Npx] (23 tailles au total avant l'audit). Cinq rôles :
      // tiny (mentions légales) < label (libellés) < note (secondaire)
      // < body (texte courant compact) < emph (valeurs mises en avant).
      fontSize: {
        tiny: ['10px', '1.4'],
        label: ['11px', '1.45'],
        note: ['12px', '1.5'],
        body: ['13px', '1.5'],
        emph: ['15px', '1.45'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
