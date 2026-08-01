import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    // Playwright gere tests/e2e : il ne doit pas etre execute par Vitest.
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/architecture/**/*.test.ts',
      'src/**/*.test.{ts,tsx}',
    ],
  },
});
