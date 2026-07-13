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

const screens = [
  { name: 'inicio-sesion', path: '/', authenticated: false },
  { name: 'registro', path: '/registro', authenticated: false },
  { name: 'cartelera', path: '/menuPrincipal', authenticated: false },
  { name: 'cines', path: '/cines', authenticated: true },
  { name: 'dulceria', path: '/dulceria', authenticated: true },
  { name: 'social', path: '/social', authenticated: true },
  { name: 'perfil-social', path: '/social/6', authenticated: true },
  { name: 'editar-perfil', path: '/social/editarPerfil', authenticated: true },
  { name: 'pelicula-social', path: '/social/pelicula/1', authenticated: true },
  { name: 'detalle-pelicula', path: '/menuPrincipal/detallePelicula/1', authenticated: true },
  { name: 'pagina-no-encontrada', path: '/ruta-inexistente', authenticated: false },
];

const openScreen = async (page, screen) => {
  await page.goto('/');
  await page.evaluate(({ session, enabled }) => {
    sessionStorage.clear();
    if (enabled) {
      sessionStorage.setItem('filmate_auth_session', JSON.stringify(session));
    }
  }, { session: authenticatedSession, enabled: screen.authenticated });
  await page.goto(screen.path);
  await page.waitForLoadState('networkidle');
  await page.locator('main, body').first().waitFor({ state: 'visible' });
};

test.skip(({ browserName }) => browserName !== 'webkit', 'La auditoría táctil usa el perfil oficial de iPhone 15 Pro Max');

for (const screen of screens) {
  test(`${screen.name} fits the iPhone 15 Pro Max viewport`, async ({ page }, testInfo) => {
    await openScreen(page, screen);

    const report = await page.evaluate(() => {
      const root = document.documentElement;
      const controls = [...document.querySelectorAll('input, select, textarea')]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          name: element.getAttribute('name') || element.getAttribute('aria-label') || element.id || '',
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        }));
      const interactiveTargets = [...document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')]
        .filter((element) => !element.matches('[data-compact-seat="true"]'))
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });

      return {
        viewportWidth: window.innerWidth,
        documentWidth: root.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        undersizedInputs: controls.filter((control) => control.fontSize < 16),
        undersizedTargets: interactiveTargets.filter((target) => target.width < 44 || target.height < 44),
      };
    });

    await testInfo.attach(`${screen.name}-layout-report`, {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: testInfo.outputPath(`${screen.name}.png`),
      fullPage: true,
    });

    expect(report.documentWidth, `${screen.path} desborda horizontalmente`).toBeLessThanOrEqual(report.viewportWidth + 1);
    expect(report.bodyWidth, `${screen.path} desborda horizontalmente`).toBeLessThanOrEqual(report.viewportWidth + 1);
    expect(report.undersizedInputs, `${screen.path} contiene inputs que activan zoom en iOS`).toEqual([]);
    expect(report.undersizedTargets, `${screen.path} contiene objetivos táctiles menores a 44 px`).toEqual([]);
  });
}
