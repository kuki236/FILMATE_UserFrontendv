import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs', 'manual-usuario', 'capturas');
const BASE_URL = process.env.FILMATE_URL || 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await fs.mkdir(OUTPUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--disable-dev-shm-usage', '--font-render-hinting=none'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  locale: 'es-PE',
  timezoneId: 'America/Lima',
  acceptDownloads: true,
});

const page = await context.newPage();
page.setDefaultTimeout(15_000);

const shot = async (name, options = {}) => {
  await page.waitForTimeout(options.delay ?? 600);
  await page.screenshot({
    path: path.join(OUTPUT, `${name}.png`),
    fullPage: Boolean(options.fullPage),
  });
  console.log(`captured ${name}.png`);
};

const registeredSession = {
  mode: 'registered',
  user: {
    id_usuario: 5,
    nombre: 'Valeria Belén Espinoza',
    username: 'vale_espinoza',
    correo: 'valeria.es@outlook.com',
    telefono: '934125789',
    estado: 'ACTIVO',
  },
};

const setSession = async () => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((session) => {
    localStorage.setItem('filmate_auth_session', JSON.stringify(session));
  }, registeredSession);
};

try {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await shot('01-inicio-sesion');

  await page.getByPlaceholder('correo@ejemplo.com').fill('correo-invalido');
  await page.getByPlaceholder('Contraseña').fill('123456');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await shot('02-validacion-inicio-sesion');

  await page.goto(`${BASE_URL}/registro`, { waitUntil: 'networkidle' });
  await shot('03-registro-usuario', { fullPage: true });

  await page.getByPlaceholder('Ingresa tu nombre completo').fill('Usuario Demostración');
  await page.getByPlaceholder('Ingresa tu nombre de usuario').fill('usuario_demo');
  await page.getByPlaceholder('Ingresa tu correo electrónico').fill('usuario.demo@filmate.pe');
  await page.getByPlaceholder('DNI, CE o RUC').fill('76543210');
  await page.getByPlaceholder('Ingresa tu contraseña').fill('Filmate2026');
  await page.getByPlaceholder('Ingresa tu teléfono (opcional)').fill('987654321');
  await shot('04-registro-completado', { fullPage: true });

  await setSession();
  await page.goto(`${BASE_URL}/menuPrincipal`, { waitUntil: 'networkidle' });
  await page.getByText('Amos del Universo', { exact: true }).first().waitFor();
  await shot('05-cartelera-principal', { fullPage: true });

  const filterSelects = page.locator('select');
  if (await filterSelects.count() >= 3) {
    await filterSelects.nth(1).selectOption({ label: 'Filmate La Molina' });
    await page.waitForTimeout(500);
    await shot('06-filtros-cartelera');
  }

  await page.goto(`${BASE_URL}/menuPrincipal/detallePelicula/1`, { waitUntil: 'networkidle' });
  await page.getByText('Amos del Universo', { exact: true }).first().waitFor();
  await shot('07-detalle-pelicula', { fullPage: true });

  const showtimeButton = page.getByRole('button', { name: /04:00|16:00/i }).first();
  await showtimeButton.scrollIntoViewIfNeeded();
  await shot('08-horarios-por-cine');
  await showtimeButton.click();
  await page.getByText('Seleccionar Asientos', { exact: false }).waitFor();
  await shot('09-mapa-asientos');

  await page.getByRole('button', { name: /Asiento D5,/ }).click();
  await page.getByRole('button', { name: /Asiento D6,/ }).click();
  await shot('10-asientos-seleccionados');

  await page.getByRole('button', { name: /Siguiente/i }).click();
  await page.getByText('Confirmar asientos').waitFor();
  await shot('11-confirmacion-asientos');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await page.getByText('Completa tu compra').waitFor();
  await shot('12-dulceria-reserva', { fullPage: true });
  await page.getByRole('button', { name: /Agregar Combo Personal Filmate|Agregar/i }).first().click();
  await shot('13-carrito-dulceria', { fullPage: true });

  const continueButton = page.getByRole('button', { name: /Confirmar pedido/i }).last();
  await continueButton.click();
  await page.getByText('Verifica tu compra').waitFor();
  await shot('14-verificacion-compra');

  const payButton = page.getByRole('button', { name: /Pagar ahora/i }).last();
  await payButton.click();
  await page.getByText('Pago', { exact: true }).waitFor();
  await shot('15-metodo-pago');

  await page.getByRole('button', { name: /Pagar con/i }).last().click();
  await page.getByText('Ticket de compra').waitFor();
  await shot('16-ticket-compra');

  await page.goto(`${BASE_URL}/cines`, { waitUntil: 'networkidle' });
  await page.getByText('Filmate La Molina').waitFor();
  await shot('17-listado-cines', { fullPage: true });
  await page.getByRole('button', { name: /Ver en Google Maps/i }).first().click();
  await page.waitForTimeout(1000);
  await shot('18-mapa-cine');

  await page.goto(`${BASE_URL}/social`, { waitUntil: 'networkidle' });
  await page.getByText('Valeria Belén Espinoza').waitFor();
  await shot('19-perfil-social');

  await page.getByPlaceholder('Buscar username').fill('mateo');
  await page.getByText('mateo_g').waitFor();
  await shot('20-busqueda-usuarios');
  await page.getByText('mateo_g').click();
  await page.getByRole('button', { name: /Seguir/ }).waitFor();
  await shot('21-perfil-otro-usuario');

  await page.goto(`${BASE_URL}/social/editarPerfil`, { waitUntil: 'networkidle' });
  await page.getByText('Editar perfil').waitFor();
  await shot('22-editar-perfil', { fullPage: true });
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByText('Seleccionar favoritas').waitFor();
  await shot('23-seleccionar-favoritas');
  await page.keyboard.press('Escape').catch(() => {});

  await page.goto(`${BASE_URL}/menuPrincipal`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Cerrar Sesión/i }).click();
  await page.getByText('¿Cerrar sesión?').waitFor();
  await shot('24-cerrar-sesion');
} finally {
  await browser.close();
}
