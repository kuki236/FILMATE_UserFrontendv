# Bitacora de pruebas - Filmate UserFrontend

Fecha: 2026-06-23  
Entorno: Windows 11, Node.js `v24.11.1`, npm `11.6.2`

## Antes

Estado inicial observado:

- No existia script `test`.
- No existia configuracion de cobertura.
- No existia configuracion SonarQube.
- No existian pruebas E2E automatizadas.
- `node_modules` ya estaba presente.
- `npm audit` reporto 3 vulnerabilidades corregibles:
  - 1 baja en `@babel/core`.
  - 1 moderada en `dompurify`.
  - 1 alta en `vite`.

## Durante

Cambios aplicados:

- Se instalaron dependencias de prueba:
  - `vitest`
  - `@vitest/coverage-v8`
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`
  - `jsdom`
  - `@playwright/test`
  - `@axe-core/playwright`
  - `sonar-scanner`
- Se ejecuto `npm audit fix`; resultado final: 0 vulnerabilidades.
- Se descargo Chromium de Playwright para pruebas E2E reproducibles.
- Se agregaron scripts npm:
  - `test`
  - `test:watch`
  - `test:coverage`
  - `test:e2e`
  - `test:e2e:headed`
  - `test:all`
  - `sonar`
- Se agrego `sonar-project.properties`.
- Se agrego runner E2E propio en `scripts/e2e/run-playwright.mjs` para evitar bloqueos de cierre de servidores en Windows.
- Se agregaron pruebas unitarias/integracion en `src/Component`.
- Se agregaron pruebas E2E en `tests/e2e`.
- Se corrigio un caso real en `normalizeMovie`: ahora los generos/directores/actores anidados tambien son considerados por `parseTextList`.
- Se limpiaron hallazgos de lint:
  - imports `React` sin uso.
  - valor `allPeliculasSorted` sin uso.
  - dependencias de hooks en `MenuPrincipal`.
  - callback de login recreado en cada render.
- Se mejoro accesibilidad del login:
  - contenedor `main`.
  - `h1` accesible visualmente oculto.
  - labels asociados a inputs.
  - enlace de registro sin boton anidado.
- Se agrego `aria-label`/`aria-expanded` al boton de menu movil.

## Despues

Resultados finales ejecutados:

| Comando | Resultado | Notas |
| --- | --- | --- |
| `npm run lint` | OK | 0 errores, 0 warnings |
| `npm run test:coverage` | OK | 4 archivos, 17 tests pasan |
| `npm run test:e2e` | OK | 8 tests pasan en `chromium` y `mobile-chrome` |
| `npm run build` | OK | Build generado en `dist/` |
| `npm audit --json` | OK | 0 vulnerabilidades |
| `npm run sonar -- --define sonar.host.url=http://127.0.0.1:9000` | No ejecutable en este entorno | servidor SonarQube local no disponible, conexion rechazada |

Cobertura generada por Vitest:

| Metrica | Resultado |
| --- | ---: |
| Statements | 8.54% |
| Branches | 12.65% |
| Functions | 8.47% |
| Lines | 8.94% |

Nota: la cobertura global es baja porque se mide todo `src`. Las pruebas actuales priorizan normalizadores, sesion, rutas protegidas, login y flujos E2E. Se recomienda ampliar pruebas unitarias para `DetallePelicula`, `Dulceria` y `Social`.

Advertencias no bloqueantes:

- `npm run build` advierte que un chunk supera 500 kB despues de minificacion. La causa probable es el uso de librerias pesadas como `jspdf` y `html2canvas`. El build termina correctamente.
- SonarQube requiere servidor y token. La configuracion y el reporte `coverage/lcov.info` quedaron listos.
