import { defineConfig, devices } from '@playwright/test';

/**
 * Un seul test smoke a ce stade (J1.3). Le socle n'a pas de parcours a couvrir.
 * Les scenarios viendront avec les fonctionnalites, pas avant.
 *
 * Profil mobile par defaut : contrainte CDC, l'application est mobile-first.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
