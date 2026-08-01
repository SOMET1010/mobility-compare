import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Le CDC impose un premier chargement < 1 Mo sur 3G.
    // Ce seuil est un garde-fou, pas une cible.
    chunkSizeWarningLimit: 500,
  },
});
