import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.js';

test('catalog renders mocked movies and filters by genre', async ({ page }) => {
  await page.goto('/menuPrincipal');

  await expect(page.getByRole('heading', { name: 'Cartelera', exact: true })).toBeVisible();
  await expect(page.getByText('Amos del Universo').first()).toBeVisible();

  await page.locator('select').nth(2).selectOption('documental');

  const catalog = page.getByRole('heading', { name: 'Cartelera', exact: true }).locator('..');
  await expect(catalog.getByText('Paucartambo')).toBeVisible();
  await expect(catalog.getByText('Amos del Universo')).toHaveCount(0);
});

test('login page has no critical automated accessibility violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations).toEqual([]);
});
