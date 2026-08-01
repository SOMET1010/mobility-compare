import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST — J1.3
 * Verifie uniquement que l'application se charge sans erreur console et
 * affiche son shell. Rien de metier : il n'y a pas encore de metier.
 */
test("l'application se charge et affiche le shell", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page.getByTestId('product-name')).toBeVisible();
  await expect(page.getByText(/Abidjan/)).toBeVisible();
  expect(consoleErrors, `Erreurs console : ${consoleErrors.join(' | ')}`).toEqual([]);
});

test("aucun secret n'est expose dans le bundle servi", async ({ page }) => {
  const bundles: string[] = [];
  page.on('response', async (response) => {
    if (response.url().endsWith('.js')) bundles.push(await response.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const joined = bundles.join('\n');
  expect(joined).not.toContain('sb_secret_');
  expect(joined).not.toMatch(/"role"\s*:\s*"service_role"/);
});
