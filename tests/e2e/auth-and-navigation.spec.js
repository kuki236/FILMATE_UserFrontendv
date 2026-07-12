import { expect, test } from './fixtures.js';

test('guest can enter the public catalog and does not see social navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
  await page.getByRole('button', { name: /entrar como invitado/i }).click();

  await expect(page).toHaveURL(/\/menuPrincipal$/);
  await expect(page.getByRole('heading', { name: 'Recomendaciones' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Social' })).toHaveCount(0);
});

test('registered login opens the catalog and enables social navigation', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('correo@ejemplo.com').fill('valeria.es@outlook.com');
  await page.getByPlaceholder(/Contrase/i).fill('secret123');
  await page.getByRole('button', { name: /Iniciar sesi/i }).click();

  await expect(page).toHaveURL(/\/menuPrincipal$/);
  await expect(page.getByText(/Según tus favoritos:/i)).toBeVisible();
  if ((page.viewportSize()?.width || 1280) < 768) {
    const mobileMenuButton = page.getByRole('button', { name: 'Abrir menu' });
    await expect(mobileMenuButton).toBeVisible();
    await mobileMenuButton.click();
  }
  await expect(page.getByRole('button', { name: 'Social' })).toBeVisible();

  await page.getByRole('button', { name: 'Cines' }).click();
  await expect(page).toHaveURL(/\/cines$/);
  await expect(page.getByRole('heading', { name: 'Nuestros locales' })).toBeVisible();
  await expect(page.getByText('Filmate La Molina')).toBeVisible();
});
