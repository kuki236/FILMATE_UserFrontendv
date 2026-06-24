# Plan de pruebas - Filmate UserFrontend

Fecha de referencia: 2026-06-23.

## Objetivo

Validar el frontend de usuario de Filmate con una combinacion de pruebas automaticas y analisis estatico que cubra:

- Calidad estatica del codigo.
- Funciones puras y normalizacion de datos.
- Integracion de componentes con rutas, sesion y API mockeada.
- Flujos E2E en escritorio y movil.
- Accesibilidad automatizada basica.
- Build de produccion.
- Auditoria de dependencias.
- Preparacion de cobertura para SonarQube.

## Alcance

Se modifica solo el proyecto `FILMATE_UserFrontend`.

Quedan dentro del alcance:

- `src/Component/filmateApi.js`
- `src/Component/authSession.js`
- rutas protegidas
- login y navegacion
- cartelera con filtros
- configuracion de pruebas y reportes
- documentacion en `docs/testing`

Quedan fuera del alcance:

- Backend real.
- Repositorios externos.
- Analisis SonarQube contra servidor real cuando no exista `sonar.host.url` accesible ni token.

## Tipos de prueba

| Tipo | Herramienta | Comando | Evidencia |
| --- | --- | --- | --- |
| Lint / estatico | ESLint | `npm run lint` | salida limpia |
| Unitarias | Vitest | `npm run test` | tests de normalizadores y sesion |
| Integracion de componentes | Vitest + Testing Library | `npm run test:coverage` | login, redireccion y ruta protegida |
| Cobertura | V8 / Vitest | `npm run test:coverage` | `coverage/lcov.info` |
| E2E desktop/mobile | Playwright | `npm run test:e2e` | `playwright-report/index.html` |
| Accesibilidad automatizada | Axe + Playwright | `npm run test:e2e` | prueba sin violaciones criticas/moderadas en login |
| Build | Vite | `npm run build` | `dist/` |
| Seguridad dependencias | npm audit | `npm audit --json` | 0 vulnerabilidades |
| SonarQube | sonar-scanner | `npm run sonar -- --define sonar.host.url=<url>` | requiere servidor y token |

## Criterios de aceptacion

- `npm run lint` debe finalizar en codigo 0.
- `npm run test:coverage` debe generar `coverage/lcov.info`.
- `npm run test:e2e` debe finalizar en codigo 0 en los proyectos `chromium` y `mobile-chrome`.
- `npm run build` debe finalizar en codigo 0.
- `npm audit --json` debe reportar `total: 0`.
- SonarQube debe poder ejecutarse cuando exista servidor accesible y token valido.

## Datos de prueba

Los E2E usan `scripts/manual/mock-server.mjs` como backend controlado. El runner de E2E levanta:

- Mock API: `http://127.0.0.1:8011`
- Vite app: `http://127.0.0.1:5173`

El puerto del backend mock se separo de `8000` para no interferir con un backend local real.

## Brechas conocidas

- La cobertura global unitaria es baja porque se empezo a medir todo `src`, incluyendo pantallas grandes como `DetallePelicula`, `Dulceria` y `Social`.
- Los flujos mas criticos de usuario se cubren por E2E, pero aun faltan pruebas unitarias especificas para compra de entradas, dulceria y social.
- SonarQube no se puede completar sin servidor accesible y token.
