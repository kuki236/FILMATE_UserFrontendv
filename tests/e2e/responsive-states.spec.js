import { expect, test } from './fixtures.js';

const authenticatedSession = {
  mode: 'registered',
  accessToken: 'manual-demo-token',
  user: {
    id_usuario: 5,
    nombre: 'Valeria Belén Espinoza',
    username: 'vale_espinoza',
    correo: 'valeria.es@outlook.com',
    estado: 'ACTIVO',
  },
};

const openAuthenticated = async (page, path) => {
  await page.goto('/');
  await page.evaluate((session) => {
    sessionStorage.setItem('filmate_auth_session', JSON.stringify(session));
  }, authenticatedSession);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

const assertMobileState = async (page, testInfo, name) => {
  // Measure the final interactive state, after entrance animations have settled.
  await page.waitForTimeout(400);
  const report = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const undersizedInputs = [...document.querySelectorAll('input, select, textarea')]
      .filter(visible)
      .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
      .map((element) => element.getAttribute('name') || element.id || element.tagName.toLowerCase());
    const undersizedTargets = [...document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')]
      .filter((element) => !element.matches('[data-compact-seat="true"]'))
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((target) => target.width < 44 || target.height < 44);

    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      undersizedInputs,
      undersizedTargets,
    };
  });

  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false });
  expect(report.documentWidth).toBeLessThanOrEqual(report.viewportWidth + 1);
  expect(report.bodyWidth).toBeLessThanOrEqual(report.viewportWidth + 1);
  expect(report.undersizedInputs).toEqual([]);
  expect(report.undersizedTargets).toEqual([]);
};

test.describe('responsive interactive states', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'Estados móviles validados con el perfil oficial de iPhone');

  test('PWA installation guidance on iPhone', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/menuPrincipal');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Instalar Filmate' }).click();
    await expect(page.getByRole('heading', { name: 'Añade Filmate a tu inicio' })).toBeVisible();
    await assertMobileState(page, testInfo, 'instalar-pwa-ios');
  });

  test('mobile navigation and purchases sheet', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/menuPrincipal');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: 'Social' })).toBeVisible();
    await assertMobileState(page, testInfo, 'menu-movil');

    await page.getByRole('button', { name: 'Mis compras' }).click();
    await expect(page.getByRole('heading', { name: 'Todas mis compras' })).toBeVisible();
    await assertMobileState(page, testInfo, 'compras-movil');
  });

  test('logout confirmation', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/menuPrincipal');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: /Cerrar Sesi/i }).click();
    await expect(page.getByRole('heading', { name: /Cerrar sesi/i })).toBeVisible();
    await assertMobileState(page, testInfo, 'cerrar-sesion');
  });

  test('cinema map dialog', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/cines');
    await page.getByRole('button', { name: 'Ver en Google Maps' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await assertMobileState(page, testInfo, 'mapa-cine');
  });

  test('movie trailer state', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/menuPrincipal/detallePelicula/1');
    await page.getByRole('button', { name: /Vista previa del tráiler/i }).click();
    await expect(page.getByTitle(/Tráiler de/i)).toBeVisible();
    await assertMobileState(page, testInfo, 'trailer-pelicula');
  });

  test('seat picker and confirmation', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/menuPrincipal');
    await page.getByRole('button', { name: /Amos del Universo/i }).first().click();
    await expect(page).toHaveURL(/detallePelicula\/1/);
    const showtime = page.getByRole('button').filter({ hasText: /S\/\. \d+/ }).first();
    await expect(showtime).toBeVisible();
    await showtime.click();
    await expect(page.getByRole('heading', { name: 'Seleccionar Asientos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Asiento A1, Disponible/i })).toBeVisible();
    await assertMobileState(page, testInfo, 'selector-asientos');

    await page.getByRole('button', { name: /Asiento A1, Disponible/i }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByRole('heading', { name: 'Confirmar asientos' })).toBeVisible();
    await assertMobileState(page, testInfo, 'confirmar-asientos');
  });

  test('snack checkout, payment and success dialogs', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/dulceria');
    await page.getByRole('button', { name: 'Agregar' }).first().click();
    await page.getByRole('button', { name: 'Pagar dulcería' }).click();
    await expect(page.getByRole('heading', { name: 'Verifica tu compra' })).toBeVisible();
    await assertMobileState(page, testInfo, 'verificar-compra');

    await page.getByRole('button', { name: 'Pagar ahora' }).click();
    await expect(page.getByRole('heading', { name: 'Pago' })).toBeVisible();
    await page.getByRole('button', { name: 'Usar datos de prueba' }).click();
    await assertMobileState(page, testInfo, 'pago-tarjeta');

    await page.getByRole('button', { name: /Pagar S\// }).click();
    await expect(page.getByText('Ticket de compra')).toBeVisible();
    await assertMobileState(page, testInfo, 'compra-exitosa');
  });

  test('avatar picker', async ({ page }, testInfo) => {
    await openAuthenticated(page, '/social/editarPerfil');
    await page.getByRole('button', { name: 'Modificar' }).click();
    await page.getByRole('button', { name: 'Cambiar avatar' }).click();
    await expect(page.getByRole('heading', { name: 'Elegir avatar' })).toBeVisible();
    await assertMobileState(page, testInfo, 'selector-avatar');
  });
});
