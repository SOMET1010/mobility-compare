import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palette et typographie a definir avec la marque (ADR-001).
      // Contrainte CDC : contrastes eleves, usage en plein soleil.
    },
  },
  plugins: [],
} satisfies Config;
