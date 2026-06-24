import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT_DIR = resolve(ROOT, 'docs', 'testing');
const HTML_PATH = resolve(OUT_DIR, 'Informe_Pruebas_FILMATE.html');
const PDF_PATH = resolve(OUT_DIR, 'Informe_Pruebas_FILMATE.pdf');
const LOGO_PATH = resolve(ROOT, 'public', 'logoGrandeFilmate.png');

const mimeByExt = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const imageDataUri = (path) => {
  try {
    const ext = extname(path).toLowerCase();
    const mime = mimeByExt[ext] || 'application/octet-stream';
    return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
  } catch {
    return '';
  }
};

const logo = imageDataUri(LOGO_PATH);

const readText = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const inlineMarkdown = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const parseTable = (lines, startIndex) => {
  const header = lines[startIndex]
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => inlineMarkdown(cell.trim()));
  const body = [];
  let index = startIndex + 2;

  while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
    body.push(
      lines[index]
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => inlineMarkdown(cell.trim()))
    );
    index += 1;
  }

  const head = `<thead><tr>${header.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead>`;
  const rowsHtml = body
    .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  return {
    html: `<table class="compact-table">${head}<tbody>${rowsHtml}</tbody></table>`,
    nextIndex: index,
  };
};

const markdownToHtml = (markdown) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const htmlParts = [];
  let index = 0;
  let inCode = false;
  let codeLines = [];

  const flushCode = () => {
    if (!codeLines.length) return;
    htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim().startsWith('```')) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        inCode = true;
      }
      index += 1;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      index += 1;
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:-]+\|/.test(lines[index + 1] || '')) {
      const parsed = parseTable(lines, index);
      htmlParts.push(parsed.html);
      index = parsed.nextIndex;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5);
      htmlParts.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\d+\.\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${inlineMarkdown(item[1])}</li>`);
        index += 1;
      }
      htmlParts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const unordered = line.match(/^-\s+(.+)$/);
    if (unordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^-\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${inlineMarkdown(item[1])}</li>`);
        index += 1;
      }
      htmlParts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (line.startsWith('> ')) {
      htmlParts.push(`<div class="callout">${inlineMarkdown(line.slice(2))}</div>`);
      index += 1;
      continue;
    }

    htmlParts.push(`<p>${inlineMarkdown(line)}</p>`);
    index += 1;
  }

  flushCode();
  return htmlParts.join('\n');
};

const packageJson = JSON.parse(readText('package.json'));
const sonarProperties = readText('sonar-project.properties');
const planMarkdown = readText('docs/testing/PLAN_PRUEBAS.md');
const bitacoraMarkdown = readText('docs/testing/BITACORA_PRUEBAS.md');
const sonarMarkdown = readText('docs/testing/SONARQUBE.md');

const scriptsRows = Object.entries(packageJson.scripts).map(([name, command]) => [
  `<code>npm run ${escapeHtml(name)}</code>`,
  `<code>${escapeHtml(command)}</code>`,
]);

const devDependencyRows = Object.entries(packageJson.devDependencies)
  .filter(([name]) =>
    [
      '@axe-core/playwright',
      '@playwright/test',
      '@testing-library/jest-dom',
      '@testing-library/react',
      '@testing-library/user-event',
      '@vitest/coverage-v8',
      'jsdom',
      'sonar-scanner',
      'vitest',
    ].includes(name)
  )
  .map(([name, version]) => [`<code>${escapeHtml(name)}</code>`, `<code>${escapeHtml(version)}</code>`]);

const unitTestRows = [
  ['authSession.test.js', '4', 'Sesion invitado, sesion registrada, limpieza y JSON invalido.'],
  ['filmateApi.test.js', '8', 'Normalizadores, busqueda, login, errores traducidos y funciones.'],
  ['ProtectedRoute.test.jsx', '2', 'Redireccion de invitados y acceso registrado.'],
  ['IniciarSesion.test.jsx', '3', 'Validacion, login registrado y acceso invitado.'],
];

const e2eRows = [
  ['auth-and-navigation.spec.js', 'guest can enter the public catalog and does not see social navigation', 'chromium + mobile-chrome'],
  ['auth-and-navigation.spec.js', 'registered login opens the catalog and enables social navigation', 'chromium + mobile-chrome'],
  ['catalog-and-accessibility.spec.js', 'catalog renders mocked movies and filters by genre', 'chromium + mobile-chrome'],
  ['catalog-and-accessibility.spec.js', 'login page has no critical automated accessibility violations', 'chromium + mobile-chrome'],
];

const fileInventoryRows = [
  ['Configuracion', 'package.json, package-lock.json, vite.config.js, eslint.config.js, playwright.config.js, sonar-project.properties'],
  ['Runner E2E', 'scripts/e2e/run-playwright.mjs'],
  ['Reporte PDF', 'scripts/testing/generate-testing-report.mjs, docs/testing/Informe_Pruebas_FILMATE.pdf'],
  ['Pruebas unitarias/integracion', 'src/Component/*.test.js, src/Component/*.test.jsx, src/test/setup.js'],
  ['Pruebas E2E', 'tests/e2e/*.spec.js'],
  ['Documentacion', 'docs/testing/PLAN_PRUEBAS.md, BITACORA_PRUEBAS.md, SONARQUBE.md'],
  ['Mejoras de app', 'Header.jsx, IniciarSesion.jsx, MenuPrincipal.jsx, filmateApi.js y limpieza de imports React sin uso'],
];

const rows = (items) =>
  items
    .map(
      (cells) =>
        `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
    )
    .join('');

const resultBadge = (text, type = 'ok') => `<span class="badge ${type}">${text}</span>`;

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe de Pruebas FILMATE</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #172033;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      background: #fff;
    }

    .cover {
      min-height: 258mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      page-break-after: always;
      border: 1px solid #dbe4f0;
      padding: 24mm 18mm;
      position: relative;
      overflow: hidden;
    }

    .cover::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(135deg, rgba(15, 23, 42, .06), transparent 44%),
        radial-gradient(circle at 80% 16%, rgba(239, 68, 68, .14), transparent 23%),
        radial-gradient(circle at 15% 80%, rgba(37, 99, 235, .12), transparent 25%);
      z-index: -1;
    }

    .logo {
      width: 92px;
      height: auto;
      margin: 0 auto 18px;
    }

    .eyebrow {
      color: #1d4ed8;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 10px 0 0;
      color: #0f172a;
      font-size: 31pt;
      line-height: 1;
      letter-spacing: 0;
    }

    .brand {
      color: #ef4444;
      display: block;
      font-size: 35pt;
      margin-top: 8px;
    }

    .subtitle {
      max-width: 142mm;
      margin: 16px auto 24px;
      color: #475569;
      font-size: 12.5pt;
    }

    .meta {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      text-align: left;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
    }

    .meta th,
    .meta td,
    table th,
    table td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      vertical-align: top;
    }

    .meta th,
    table th {
      background: #1e3a8a;
      color: #fff;
      font-weight: 800;
    }

    .meta td:first-child {
      width: 42%;
      color: #334155;
      font-weight: 700;
      background: #f8fafc;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 8.5pt;
    }

    header strong {
      color: #0f172a;
    }

    section {
      page-break-inside: avoid;
      margin-bottom: 16px;
    }

    h2 {
      color: #1e40af;
      font-size: 17pt;
      margin: 0 0 8px;
      padding-top: 4px;
    }

    h3 {
      color: #be185d;
      font-size: 12.5pt;
      margin: 14px 0 6px;
    }

    p {
      margin: 0 0 8px;
      text-align: justify;
    }

    .lead {
      color: #334155;
      font-size: 11.2pt;
    }

    .callout {
      border: 1px solid #93c5fd;
      background: #eff6ff;
      color: #1e3a8a;
      border-radius: 8px;
      padding: 10px 12px;
      font-weight: 700;
      margin: 10px 0;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .panel {
      border: 1px solid #d8e0ec;
      border-radius: 8px;
      padding: 12px;
      background: #fbfdff;
    }

    .panel h3 {
      margin-top: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
      page-break-inside: avoid;
    }

    tbody tr:nth-child(even) td {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-weight: 800;
      font-size: 8.2pt;
      white-space: nowrap;
    }

    .badge.ok {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }

    .badge.warn {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }

    ul,
    ol {
      margin-top: 4px;
      padding-left: 18px;
    }

    li {
      margin-bottom: 4px;
    }

    .footer-note {
      margin-top: 22px;
      color: #64748b;
      font-size: 8.5pt;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }

    .page-break {
      page-break-before: always;
    }

    .appendix {
      page-break-inside: auto;
    }

    .compact-table {
      font-size: 8.7pt;
    }

    code {
      color: #be123c;
      font-family: Consolas, "Courier New", monospace;
      font-size: .92em;
    }

    pre {
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #d8e0ec;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.3pt;
      line-height: 1.35;
      margin: 8px 0 12px;
    }

    .toc {
      columns: 2;
      column-gap: 18px;
    }

    .toc li {
      break-inside: avoid;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0 14px;
    }

    .kpi {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      background: #f8fafc;
      text-align: center;
    }

    .kpi strong {
      display: block;
      color: #1e40af;
      font-size: 16pt;
      line-height: 1.1;
    }

    .kpi span {
      color: #475569;
      font-size: 8.3pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .muted {
      color: #64748b;
      font-size: 9pt;
    }
  </style>
</head>
<body>
  <div class="cover">
    ${logo ? `<img class="logo" src="${logo}" alt="Filmate">` : ''}
    <div class="eyebrow">Gestión de calidad y pruebas</div>
    <h1>INFORME DE PRUEBAS<span class="brand">FILMATE</span></h1>
    <p class="subtitle">Validación técnica del frontend de usuario: pruebas unitarias, integración, E2E, accesibilidad, build, seguridad de dependencias y preparación para SonarQube.</p>
    <table class="meta">
      <tr><th>Campo</th><th>Información</th></tr>
      <tr><td>Código del documento</td><td>IP-FILMATE-USR-001</td></tr>
      <tr><td>Proyecto</td><td>FILMATE UserFrontend</td></tr>
      <tr><td>Versión</td><td>1.0</td></tr>
      <tr><td>Fecha de ejecución</td><td>23 de junio de 2026</td></tr>
      <tr><td>Entorno</td><td>Windows 11, Node.js v24.11.1, npm 11.6.2</td></tr>
      <tr><td>Estado</td><td>${resultBadge('VALIDADO')}</td></tr>
      <tr><td>Responsable</td><td>Equipo del proyecto FILMATE</td></tr>
    </table>
  </div>

  <header>
    <strong>FILMATE | Informe de pruebas | IP-FILMATE-USR-001 | v1.0</strong>
    <span>23/06/2026</span>
  </header>

  <section>
    <h2>1. Resumen ejecutivo</h2>
    <p class="lead">Se implementó una base completa de pruebas automatizadas para el frontend de usuario. La verificación integral final ejecutó lint, cobertura, build y pruebas E2E con backend mock local. El resultado fue satisfactorio.</p>
    <div class="callout">Resultado final: <strong>npm run test:all</strong> terminó correctamente. Se validaron 17 pruebas unitarias/integración y 8 pruebas E2E en escritorio y móvil.</div>
  </section>

  <section>
    <h2>Indicadores principales</h2>
    <div class="kpi-row">
      <div class="kpi"><strong>17</strong><span>Unitarias / integracion</span></div>
      <div class="kpi"><strong>8</strong><span>E2E desktop/mobile</span></div>
      <div class="kpi"><strong>0</strong><span>Vulnerabilidades</span></div>
      <div class="kpi"><strong>1</strong><span>Servidor Sonar requerido</span></div>
    </div>
  </section>

  <section>
    <h2>Contenido del informe</h2>
    <ol class="toc">
      <li>Resumen ejecutivo</li>
      <li>Matriz de resultados</li>
      <li>Cobertura generada</li>
      <li>Antes, durante y despues</li>
      <li>Tipos de pruebas cubiertos</li>
      <li>SonarQube</li>
      <li>Archivos de evidencia</li>
      <li>Recomendaciones</li>
      <li>Inventario completo de pruebas</li>
      <li>Scripts y dependencias de calidad</li>
      <li>Configuracion SonarQube</li>
      <li>Inventario de archivos creados/modificados</li>
      <li>Anexos documentales completos</li>
    </ol>
  </section>

  <section>
    <h2>2. Matriz de resultados</h2>
    <table>
      <thead><tr><th>Comando</th><th>Tipo</th><th>Resultado</th><th>Observación</th></tr></thead>
      <tbody>
        ${rows([
          ['npm run lint', 'Estático', resultBadge('OK'), '0 errores y 0 warnings.'],
          ['npm run test:coverage', 'Unitarias / integración', resultBadge('OK'), '4 archivos de prueba, 17 tests pasaron. Generó coverage/lcov.info.'],
          ['npm run build', 'Producción', resultBadge('OK'), 'Build generado en dist/. Advertencia no bloqueante por chunk mayor a 500 kB.'],
          ['npm run test:e2e', 'E2E / accesibilidad', resultBadge('OK'), '8 tests pasaron en chromium y mobile-chrome.'],
          ['npm audit --json', 'Seguridad', resultBadge('OK'), '0 vulnerabilidades.'],
          ['npm run sonar', 'SonarQube', resultBadge('CONDICIONADO', 'warn'), 'Scanner listo; requiere servidor SonarQube accesible y token.'],
        ])}
      </tbody>
    </table>
  </section>

  <section>
    <h2>3. Cobertura generada</h2>
    <table>
      <thead><tr><th>Métrica</th><th>Resultado</th><th>Comentario</th></tr></thead>
      <tbody>
        ${rows([
          ['Statements', '8.54%', 'Cobertura inicial midiendo todo src.'],
          ['Branches', '12.65%', 'Quedan pantallas grandes sin unitarias específicas.'],
          ['Functions', '8.47%', 'Los flujos principales están reforzados con E2E.'],
          ['Lines', '8.94%', 'Reporte disponible para SonarQube en coverage/lcov.info.'],
        ])}
      </tbody>
    </table>
  </section>

  <section class="page-break">
    <h2>4. Antes, durante y después</h2>
    <div class="grid">
      <div class="panel">
        <h3>Antes</h3>
        <ul>
          <li>No existía script de pruebas.</li>
          <li>No había cobertura ni configuración SonarQube.</li>
          <li>No había E2E automatizado.</li>
          <li>npm audit reportaba 3 vulnerabilidades corregibles.</li>
        </ul>
      </div>
      <div class="panel">
        <h3>Durante</h3>
        <ul>
          <li>Se instalaron Vitest, Testing Library, Playwright, Axe y sonar-scanner.</li>
          <li>Se agregó runner E2E propio para Windows.</li>
          <li>Se corrigieron hallazgos de lint y accesibilidad.</li>
          <li>Se mejoró normalización de datos anidados en filmateApi.</li>
        </ul>
      </div>
    </div>
    <div class="panel">
      <h3>Después</h3>
      <ul>
        <li>La suite integral terminó en estado OK.</li>
        <li>Las dependencias quedaron sin vulnerabilidades conocidas por npm audit.</li>
        <li>La evidencia y los comandos quedaron documentados en docs/testing.</li>
        <li>SonarQube quedó preparado para ejecutarse cuando exista servidor y token.</li>
      </ul>
    </div>
  </section>

  <section>
    <h2>5. Tipos de pruebas cubiertos</h2>
    <table>
      <thead><tr><th>Tipo</th><th>Herramienta</th><th>Objetivo</th></tr></thead>
      <tbody>
        ${rows([
          ['Lint / estático', 'ESLint', 'Detectar errores, imports sin uso y reglas de hooks.'],
          ['Unitarias', 'Vitest', 'Validar sesión y normalizadores de datos.'],
          ['Integración UI', 'Testing Library', 'Validar login, redirección y rutas protegidas.'],
          ['E2E desktop/móvil', 'Playwright', 'Validar navegación, catálogo, filtros y login con API mock.'],
          ['Accesibilidad', 'Axe + Playwright', 'Detectar violaciones automatizadas en la pantalla de login.'],
          ['Seguridad dependencias', 'npm audit', 'Verificar vulnerabilidades conocidas.'],
          ['Calidad continua', 'SonarQube', 'Consumir cobertura LCOV y reglas de calidad.'],
        ])}
      </tbody>
    </table>
  </section>

  <section>
    <h2>6. SonarQube</h2>
    <p>Se agregó <strong>sonar-project.properties</strong> y se configuró el reporte de cobertura JavaScript con <strong>coverage/lcov.info</strong>. El intento local contra <strong>http://127.0.0.1:9000</strong> no pudo completarse porque no había servidor SonarQube escuchando.</p>
    <div class="callout">Comando recomendado: npm run sonar -- --define sonar.host.url=&lt;URL&gt; --define sonar.token=&lt;TOKEN&gt;</div>
  </section>

  <section>
    <h2>7. Archivos de evidencia</h2>
    <table>
      <thead><tr><th>Archivo</th><th>Propósito</th></tr></thead>
      <tbody>
        ${rows([
          ['docs/testing/PLAN_PRUEBAS.md', 'Estrategia, alcance y criterios de aceptación.'],
          ['docs/testing/BITACORA_PRUEBAS.md', 'Registro antes, durante y después con resultados.'],
          ['docs/testing/SONARQUBE.md', 'Guía de ejecución SonarQube.'],
          ['coverage/lcov.info', 'Reporte de cobertura para SonarQube.'],
          ['playwright-report/index.html', 'Reporte navegable de pruebas E2E.'],
          ['docs/testing/Informe_Pruebas_FILMATE.pdf', 'Informe portable para entrega.'],
        ])}
      </tbody>
    </table>
  </section>

  <section>
    <h2>8. Recomendaciones</h2>
    <ol>
      <li>Agregar pruebas unitarias específicas para DetallePelicula, Dulceria y Social.</li>
      <li>Configurar SonarQube en CI con SONAR_HOST_URL y SONAR_TOKEN.</li>
      <li>Evaluar code splitting para reducir el chunk grande asociado a librerías de PDF/captura.</li>
      <li>Mantener npm audit como parte de la validación previa a entrega.</li>
    </ol>
  </section>

  <p class="footer-note">FILMATE UserFrontend - Informe generado automáticamente desde scripts/testing/generate-testing-report.mjs</p>
  <section class="page-break">
    <h2>9. Inventario completo de pruebas automatizadas</h2>
    <h3>9.1 Pruebas unitarias e integracion</h3>
    <table>
      <thead><tr><th>Archivo</th><th>Casos</th><th>Cobertura funcional</th></tr></thead>
      <tbody>${rows(unitTestRows)}</tbody>
    </table>
    <h3>9.2 Pruebas E2E y accesibilidad</h3>
    <table>
      <thead><tr><th>Archivo</th><th>Caso</th><th>Proyecto Playwright</th></tr></thead>
      <tbody>${rows(e2eRows)}</tbody>
    </table>
    <p class="muted">Cada caso E2E se ejecuta contra backend mock local y se repite en escritorio y movil.</p>
  </section>

  <section>
    <h2>10. Scripts y dependencias de calidad</h2>
    <h3>10.1 Scripts npm disponibles</h3>
    <table>
      <thead><tr><th>Script</th><th>Comando real</th></tr></thead>
      <tbody>${rows(scriptsRows)}</tbody>
    </table>
    <h3>10.2 Dependencias agregadas para pruebas y analisis</h3>
    <table>
      <thead><tr><th>Dependencia</th><th>Version declarada</th></tr></thead>
      <tbody>${rows(devDependencyRows)}</tbody>
    </table>
  </section>

  <section>
    <h2>11. Configuracion SonarQube incluida</h2>
    <p>El proyecto ya contiene un archivo de propiedades listo para que SonarQube consuma fuentes, pruebas y cobertura LCOV.</p>
    <pre><code>${escapeHtml(sonarProperties.trim())}</code></pre>
  </section>

  <section>
    <h2>12. Inventario de archivos creados o modificados</h2>
    <table>
      <thead><tr><th>Grupo</th><th>Archivos</th></tr></thead>
      <tbody>${rows(fileInventoryRows)}</tbody>
    </table>
  </section>

  <section class="appendix page-break">
    <h2>Anexo A. Plan de pruebas completo</h2>
    ${markdownToHtml(planMarkdown)}
  </section>

  <section class="appendix page-break">
    <h2>Anexo B. Bitacora completa de ejecucion</h2>
    ${markdownToHtml(bitacoraMarkdown)}
  </section>

  <section class="appendix page-break">
    <h2>Anexo C. Guia completa de SonarQube</h2>
    ${markdownToHtml(sonarMarkdown)}
  </section>

  <p class="footer-note">FILMATE UserFrontend - Informe ampliado generado automaticamente desde scripts/testing/generate-testing-report.mjs</p>
</body>
</html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(HTML_PATH, html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(HTML_PATH).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: PDF_PATH,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%; font-size:8px; color:#64748b; padding:0 16mm; display:flex; justify-content:space-between; font-family:Segoe UI, Arial, sans-serif;">
      <span>FILMATE | Informe de pruebas</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>
  `,
  margin: {
    top: '10mm',
    right: '0mm',
    bottom: '12mm',
    left: '0mm',
  },
});
await browser.close();

console.log(HTML_PATH);
console.log(PDF_PATH);
