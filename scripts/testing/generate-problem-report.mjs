import parser from '@babel/parser';
import traverseModule from '@babel/traverse';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { globSync } from 'node:fs';

const traverse = traverseModule.default || traverseModule;
const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT_DIR = resolve(ROOT, 'docs', 'testing');
const JSON_PATH = resolve(OUT_DIR, 'Informe_Problemas_FILMATE.json');
const HTML_PATH = resolve(OUT_DIR, 'Informe_Problemas_FILMATE.html');
const PDF_PATH = resolve(OUT_DIR, 'Informe_Problemas_FILMATE.pdf');
const LOGO_PATH = resolve(ROOT, 'public', 'logoGrandeFilmate.png');

const nonInteractiveTags = new Set([
  'article',
  'aside',
  'div',
  'footer',
  'header',
  'img',
  'li',
  'main',
  'p',
  'section',
  'span',
]);

const interactiveTags = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary']);
const interactiveRoles = new Set(['button', 'link', 'menuitem', 'option', 'tab', 'checkbox', 'radio', 'switch']);
const keyboardEvents = new Set(['onKeyDown', 'onKeyUp', 'onKeyPress']);

const ruleCatalog = {
  'javascript:S6848': {
    title: 'Non-interactive DOM elements should not have an interactive handler',
    kind: 'Consistency issue',
    convention: 'Not conventional',
    maintainability: 'Low',
    reliability: 'Medium',
    why:
      'Non-interactive elements such as div, span, section or article are not designed to be activated by users. Adding click or mouse handlers to them creates behavior that is not naturally keyboard accessible and may be confusing for assistive technologies.',
    impact: [
      'Keyboard users may not be able to focus or activate the element.',
      'Screen readers may not announce the element as actionable.',
      'The markup no longer follows the semantic intent of HTML.',
    ],
    fix:
      'Use a native interactive element such as button or a. If a custom element is unavoidable, add role, tabIndex and keyboard handling, but prefer native controls.',
  },
  'javascript:S1082': {
    title: 'Mouse events should have corresponding keyboard events',
    kind: 'Intentionality issue',
    convention: 'Not complete',
    maintainability: 'Low',
    reliability: 'Low',
    why:
      'Users should be able to perform the same operation with mouse and keyboard. Click or hover behavior without key/focus alternatives leaves keyboard and assistive-technology users behind.',
    impact: [
      'Keyboard-only navigation cannot trigger the same behavior.',
      'Assistive technology users may not reach the interaction.',
      'The component behaves differently depending on the input device.',
    ],
    fix:
      'Pair onClick with onKeyDown/onKeyUp for non-native controls, and pair hover behavior with onFocus/onBlur. Prefer native button/link elements.',
  },
  'filmate:A11Y001': {
    title: 'Interactive controls should not be nested',
    kind: 'Accessibility issue',
    convention: 'Invalid interactive composition',
    maintainability: 'Low',
    reliability: 'Medium',
    why:
      'A link that contains a button, or a button that contains another interactive element, creates ambiguous focus and activation behavior.',
    impact: [
      'Browsers and screen readers can expose nested controls inconsistently.',
      'Keyboard focus order can become confusing.',
      'Click handling may activate the wrong control.',
    ],
    fix:
      'Use only one interactive element. Style the Link directly, or replace the nested button with a span/non-interactive element.',
  },
  'filmate:A11Y002': {
    title: 'Icon-only buttons should have an accessible name',
    kind: 'Accessibility issue',
    convention: 'Missing accessible label',
    maintainability: 'Low',
    reliability: 'Medium',
    why:
      'A button containing only an icon may be visually understandable but has no text alternative for screen readers.',
    impact: [
      'Screen readers may announce only "button" without purpose.',
      'Voice-control users may not know what command to say.',
      'Automated accessibility checks can flag unnamed controls.',
    ],
    fix:
      'Add aria-label or visible text. For repeated controls, include the context, for example "Cerrar modal", "Aumentar cantidad" or "Quitar favorito".',
  },
  'filmate:A11Y003': {
    title: 'Modal overlays should expose dialog semantics',
    kind: 'Accessibility issue',
    convention: 'Incomplete dialog semantics',
    maintainability: 'Low',
    reliability: 'Medium',
    why:
      'A visual modal implemented only with div elements is not automatically announced as a dialog to assistive technologies.',
    impact: [
      'Screen reader users may not know that a modal opened.',
      'Focus management expectations are unclear.',
      'The overlay may be hard to navigate with keyboard.',
    ],
    fix:
      'Add role="dialog" or role="alertdialog", aria-modal="true", a labelled heading via aria-labelledby, and ensure focus is moved into the dialog.',
  },
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const imageDataUri = (path) => {
  try {
    const ext = extname(path).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'application/octet-stream';
    return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
  } catch {
    return '';
  }
};

const getJsxName = (nameNode) => {
  if (!nameNode) return '';
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${getJsxName(nameNode.object)}.${getJsxName(nameNode.property)}`;
  }
  return '';
};

const getAttributeName = (attr) => (attr?.type === 'JSXAttribute' ? getJsxName(attr.name) : '');

const getStringAttribute = (attributes, name) => {
  const attr = attributes.find((item) => getAttributeName(item) === name);
  if (!attr?.value) return '';
  if (attr.value.type === 'StringLiteral') return attr.value.value;
  return '';
};

const hasAttribute = (attributes, name) => attributes.some((item) => getAttributeName(item) === name);

const getTextContent = (node) => {
  const parts = [];
  const visit = (item) => {
    if (!item) return;
    if (item.type === 'JSXText') parts.push(item.value);
    if (item.type === 'JSXExpressionContainer' && item.expression?.type === 'StringLiteral') {
      parts.push(item.expression.value);
    }
    if (item.type === 'JSXElement') item.children.forEach(visit);
  };
  node.children.forEach(visit);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const hasInteractiveDescendant = (node) => {
  let found = false;
  const visit = (item) => {
    if (found || item.type !== 'JSXElement') return;
    const name = getJsxName(item.openingElement.name);
    if (interactiveTags.has(name) || name === 'Link') {
      found = true;
      return;
    }
    item.children.forEach(visit);
  };
  node.children.forEach(visit);
  return found;
};

const getLineText = (source, line) => source.split(/\r?\n/)[line - 1]?.trim() || '';

const issueKey = (issue) => `${issue.rule}|${issue.file}|${issue.line}|${issue.message}`;

const analyzeFile = (filePath) => {
  const source = readFileSync(filePath, 'utf8');
  const rel = relative(ROOT, filePath).replaceAll('\\', '/');
  const issues = [];
  const seen = new Set();
  const addIssue = (rule, node, message, recommendation) => {
    const issue = {
      rule,
      file: rel,
      line: node.loc?.start?.line || 1,
      column: node.loc?.start?.column || 0,
      element: getJsxName(node.openingElement?.name),
      message,
      recommendation,
      snippet: getLineText(source, node.loc?.start?.line || 1),
    };
    const key = issueKey(issue);
    if (!seen.has(key)) {
      seen.add(key);
      issues.push(issue);
    }
  };

  const ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'importMeta'],
    errorRecovery: true,
  });

  traverse(ast, {
    JSXElement(path) {
      const node = path.node;
      const name = getJsxName(node.openingElement.name);
      const attributes = node.openingElement.attributes || [];
      const attrNames = attributes.map(getAttributeName).filter(Boolean);
      const role = getStringAttribute(attributes, 'role');
      const className = getStringAttribute(attributes, 'className');
      const hasKeyboard = attrNames.some((item) => keyboardEvents.has(item));
      const hasInteractiveRole = interactiveRoles.has(role);
      const isNativeInteractive = interactiveTags.has(name) || name === 'Link';
      const isNonInteractive = nonInteractiveTags.has(name) && !hasInteractiveRole;

      if (isNonInteractive && attrNames.some((item) => ['onClick', 'onMouseDown', 'onMouseUp'].includes(item))) {
        addIssue(
          'javascript:S6848',
          node,
          `<${name}> has an interactive handler but is not a native interactive element.`,
          'Replace it with a button/link or add role, tabIndex and keyboard handling.'
        );
      }

      if (isNonInteractive && hasAttribute(attributes, 'onClick') && !hasKeyboard) {
        addIssue(
          'javascript:S1082',
          node,
          `<${name}> handles click events without an equivalent keyboard event.`,
          'Add onKeyDown/onKeyUp handling or convert the element to a native button/link.'
        );
      }

      if (
        (hasAttribute(attributes, 'onMouseEnter') || hasAttribute(attributes, 'onMouseOver')) &&
        !hasAttribute(attributes, 'onFocus')
      ) {
        addIssue(
          'javascript:S1082',
          node,
          `<${name}> uses hover behavior without a matching focus event.`,
          'Pair hover behavior with onFocus for keyboard users.'
        );
      }

      if (
        (hasAttribute(attributes, 'onMouseLeave') || hasAttribute(attributes, 'onMouseOut')) &&
        !hasAttribute(attributes, 'onBlur')
      ) {
        addIssue(
          'javascript:S1082',
          node,
          `<${name}> uses mouse-leave behavior without a matching blur event.`,
          'Pair mouse-leave behavior with onBlur for keyboard users.'
        );
      }

      if ((name === 'Link' || name === 'a' || name === 'button') && hasInteractiveDescendant(node)) {
        addIssue(
          'filmate:A11Y001',
          node,
          `<${name}> contains another interactive control.`,
          'Keep only one interactive element; style the outer control directly.'
        );
      }

      if (name === 'button') {
        const text = getTextContent(node);
        const hasAccessibleName =
          text.length > 0 ||
          hasAttribute(attributes, 'aria-label') ||
          hasAttribute(attributes, 'aria-labelledby') ||
          hasAttribute(attributes, 'title');
        if (!hasAccessibleName) {
          addIssue(
            'filmate:A11Y002',
            node,
            'Icon-only button has no accessible name.',
            'Add aria-label or visible text that explains the action.'
          );
        }
      }

      if (
        name === 'div' &&
        className.includes('fixed') &&
        className.includes('inset-0') &&
        !hasInteractiveRole &&
        !hasAttribute(attributes, 'aria-modal')
      ) {
        addIssue(
          'filmate:A11Y003',
          node,
          'Visual modal overlay does not expose dialog semantics.',
          'Add role="dialog", aria-modal="true" and connect the dialog title with aria-labelledby.'
        );
      }
    },
  });

  return issues;
};

const files = globSync('src/Component/**/*.{jsx,js}', { cwd: ROOT, withFileTypes: false })
  .map((file) => resolve(ROOT, file));
const issues = files.flatMap(analyzeFile).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const grouped = issues.reduce((acc, issue) => {
  acc[issue.rule] ||= [];
  acc[issue.rule].push(issue);
  return acc;
}, {});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  JSON_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      total: issues.length,
      rules: Object.fromEntries(Object.entries(grouped).map(([rule, list]) => [rule, list.length])),
      issues,
    },
    null,
    2
  ),
  'utf8'
);

const rows = (items) =>
  items.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');

const badge = (text, type = 'warn') => `<span class="badge ${type}">${escapeHtml(text)}</span>`;

const renderIssue = (issue, index) => {
  const rule = ruleCatalog[issue.rule];
  return `
    <article class="issue">
      <h4>${index}. ${escapeHtml(rule.title)}</h4>
      <table class="issue-meta">
        <tr><td>Regla</td><td><code>${escapeHtml(issue.rule)}</code></td></tr>
        <tr><td>Tipo</td><td>${escapeHtml(rule.kind)} / ${escapeHtml(rule.convention)}</td></tr>
        <tr><td>Maintainability</td><td>${badge(rule.maintainability, 'low')}</td></tr>
        <tr><td>Reliability</td><td>${badge(rule.reliability, rule.reliability === 'Medium' ? 'medium' : 'low')}</td></tr>
        <tr><td>Ubicacion</td><td><code>${escapeHtml(issue.file)}:${issue.line}:${issue.column + 1}</code></td></tr>
        <tr><td>Elemento</td><td><code>&lt;${escapeHtml(issue.element)}&gt;</code></td></tr>
      </table>
      <p><strong>Problema:</strong> ${escapeHtml(issue.message)}</p>
      <p><strong>Fragmento:</strong></p>
      <pre><code>${escapeHtml(issue.snippet)}</code></pre>
      <p><strong>Recomendacion puntual:</strong> ${escapeHtml(issue.recommendation)}</p>
    </article>
  `;
};

const renderRuleSection = ([ruleId, list]) => {
  const rule = ruleCatalog[ruleId];
  return `
    <section class="rule page-break">
      <h2>${escapeHtml(rule.title)} (${escapeHtml(ruleId)})</h2>
      <div class="rule-summary">
        <div>${badge(rule.kind)}</div>
        <div>${badge(rule.convention)}</div>
        <div>Maintainability: ${badge(rule.maintainability, 'low')}</div>
        <div>Reliability: ${badge(rule.reliability, rule.reliability === 'Medium' ? 'medium' : 'low')}</div>
      </div>
      <h3>Why is this an issue?</h3>
      <p>${escapeHtml(rule.why)}</p>
      <ul>${rule.impact.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>How can I fix it?</h3>
      <p>${escapeHtml(rule.fix)}</p>
      <h3>Occurrences (${list.length})</h3>
      ${list.map(renderIssue).join('')}
    </section>
  `;
};

const summaryRows = Object.entries(grouped).map(([ruleId, list]) => [
  `<code>${escapeHtml(ruleId)}</code>`,
  escapeHtml(ruleCatalog[ruleId].title),
  String(list.length),
  escapeHtml(ruleCatalog[ruleId].reliability),
]);

const logo = imageDataUri(LOGO_PATH);
const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe de Problemas FILMATE</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.45; }
    .cover { min-height: 258mm; display: flex; flex-direction: column; justify-content: center; text-align: center; border: 1px solid #dbe4f0; padding: 24mm 18mm; page-break-after: always; background: linear-gradient(135deg, #fff 0%, #f8fafc 62%, #eff6ff 100%); }
    .logo { width: 94px; height: auto; margin: 0 auto 18px; }
    .eyebrow { color: #1d4ed8; font-size: 9pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 10px 0 0; color: #0f172a; font-size: 30pt; line-height: 1; }
    .brand { display: block; margin-top: 8px; color: #ef4444; font-size: 34pt; }
    .subtitle { max-width: 145mm; margin: 16px auto 24px; color: #475569; font-size: 12pt; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 8px; vertical-align: top; }
    th { background: #1e3a8a; color: #fff; text-align: left; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    h2 { color: #1e40af; font-size: 16.5pt; margin: 0 0 8px; }
    h3 { color: #be185d; font-size: 12pt; margin: 14px 0 6px; }
    h4 { color: #0f172a; font-size: 11pt; margin: 12px 0 6px; }
    p { margin: 0 0 8px; text-align: justify; }
    code { color: #be123c; font-family: Consolas, "Courier New", monospace; font-size: .9em; }
    pre { white-space: pre-wrap; word-break: break-word; border: 1px solid #d8e0ec; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 9px 11px; font-family: Consolas, "Courier New", monospace; font-size: 8pt; line-height: 1.35; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-weight: 800; font-size: 8pt; white-space: nowrap; background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }
    .badge.low { background: #dcfce7; color: #166534; border-color: #86efac; }
    .badge.medium { background: #fef3c7; color: #92400e; border-color: #fbbf24; }
    .rule-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 12px; }
    .issue { border: 1px solid #d8e0ec; border-radius: 8px; padding: 10px; margin: 10px 0; background: #fbfdff; page-break-inside: avoid; }
    .issue-meta td:first-child { width: 32%; font-weight: 700; color: #334155; background: #f8fafc; }
    .page-break { page-break-before: always; }
    .callout { border: 1px solid #93c5fd; background: #eff6ff; color: #1e3a8a; border-radius: 8px; padding: 10px 12px; font-weight: 700; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="cover">
    ${logo ? `<img class="logo" src="${logo}" alt="Filmate">` : ''}
    <div class="eyebrow">Análisis estático local</div>
    <h1>INFORME DE PROBLEMAS<span class="brand">FILMATE</span></h1>
    <p class="subtitle">Reporte detallado de incidencias estilo Sonar para accesibilidad, confiabilidad y mantenibilidad en el frontend de usuario.</p>
    <table>
      <tr><th>Campo</th><th>Información</th></tr>
      <tr><td>Código</td><td>IPR-FILMATE-USR-001</td></tr>
      <tr><td>Fecha</td><td>23 de junio de 2026</td></tr>
      <tr><td>Alcance</td><td><code>src/Component/**/*.{js,jsx}</code></td></tr>
      <tr><td>Total de incidencias detectadas</td><td><strong>${issues.length}</strong></td></tr>
      <tr><td>Método</td><td>Analizador JSX local + reglas equivalentes a Sonar/accesibilidad</td></tr>
    </table>
  </div>

  <section>
    <h2>1. Resumen general</h2>
    <p>Este informe enumera problemas detectados mediante análisis estático local. No reemplaza una ejecución oficial de SonarQube, pero reproduce reglas relevantes como <code>javascript:S6848</code> y <code>javascript:S1082</code>, además de controles de accesibilidad habituales.</p>
    <div class="callout">Prioridad recomendada: corregir primero <code>javascript:S6848</code> y <code>javascript:S1082</code>, porque afectan accesibilidad de teclado y uso con tecnologías asistivas.</div>
    <table>
      <thead><tr><th>Regla</th><th>Descripción</th><th>Ocurrencias</th><th>Reliability</th></tr></thead>
      <tbody>${rows(summaryRows)}</tbody>
    </table>
  </section>

  ${Object.entries(grouped).map(renderRuleSection).join('')}
</body>
</html>`;

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
      <span>FILMATE | Informe de problemas</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>
  `,
  margin: { top: '10mm', right: '0mm', bottom: '12mm', left: '0mm' },
});
await browser.close();

console.log(JSON_PATH);
console.log(HTML_PATH);
console.log(PDF_PATH);
