# Filmate User Frontend

Aplicacion frontend de Filmate desarrollada con React y Vite. Este proyecto incluye el flujo principal de usuario para iniciar sesion, registrarse, ver la cartelera, revisar detalles de peliculas y navegar por las secciones de cines, dulceria y social.

## Descripcion

Filmate es una interfaz web pensada para una experiencia visual moderna y rapida. El frontend esta organizado por componentes reutilizables y utiliza:

- React 19
- Vite
- React Router
- Tailwind CSS 4
- Lucide React para iconos

## Funcionalidades

- Pantalla de inicio de sesion con logo principal y modal de exito.
- Pantalla de registro de usuario.
- Menu principal con recomendaciones y cartelera.
- Detalle de pelicula con informacion, horarios, trailer y reseñas.
- Navegacion entre vistas con React Router.
- Header reutilizable para las secciones internas.
- Diseno responsivo para escritorio y movil.

## Requisitos

- Node.js 20.19.x o 22.12 o superior
- npm 10 o superior

## Instalacion

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

3. Copia `.env.example` a `.env.local` si necesitas cambiar la URL del backend.

## Variables de entorno

```env
VITE_API_URL=/api
VITE_WS_URL=
```

- `VITE_API_URL`: URL base de la API. En desarrollo, `/api` usa el proxy de Vite hacia `http://127.0.0.1:8000`.
- `VITE_WS_URL`: URL base opcional para WebSocket, sin `/ws/seats`. Si se omite, se deriva desde `VITE_API_URL`.

No coloques tokens, contraseñas ni secretos en variables `VITE_*`: Vite las incluye en el JavaScript público.

## Scripts disponibles

### Desarrollo

```bash
npm run dev
```

Inicia Vite en modo desarrollo.

### Compilacion

```bash
npm run build
```

Genera la version de produccion dentro de `dist/`.

### Vista previa

```bash
npm run preview
```

Sirve la build de produccion de forma local.

## Despliegue

El frontend se despliega en **Vercel**, el backend en **Render** y la base de datos en **Railway**.

### Arquitectura

```
Vercel (frontend)  ──>  Render (backend FastAPI)  ──>  Railway (MySQL)
```

El archivo `vercel.json` ya está configurado para reenviar todas las requests `/api/*` al backend en Render:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://filmate-backendv.onrender.com/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### URLs de despliegue

| Recurso | URL |
|---|---|
| Frontend (Vercel) | `https://filmate.vercel.app` |
| Backend (Render) | `https://filmate-backendv.onrender.com` |
| API Docs | `https://filmate-backendv.onrender.com/api/docs` |
| Base de datos | Railway (MySQL) |

### Variables de entorno en Vercel

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `/api` (usa el rewrite del `vercel.json`) |

No se necesita configurar `VITE_API_URL` con la URL completa del backend porque Vercel redirige `/api/*` a Render mediante los rewrites.

Antes de desplegar:

```bash
npm ci
npm run lint
npm run test
npm run build
```

### Contrato comercial actual

- El precio de entradas proviene de `precio_base` de cada función.
- Los precios y el stock de dulcería provienen de los endpoints públicos de snacks y se revalidan antes del pago.
- El frontend no consulta rutas administrativas ni aplica tasa, IVA, tipos de entrada o la matriz sala/formato, porque el backend todavía no publica ni cobra esas reglas.
- La compra exclusiva de dulcería permanece deshabilitada hasta que el backend acepte órdenes sin función ni asientos.

### Lint

```bash
npm run lint
```

Ejecuta ESLint sobre el proyecto.

### Pruebas

```bash
npm run test
npm run test:coverage
npm run test:e2e
npm run test:all
```

Las pruebas unitarias e integracion usan Vitest y Testing Library. Las E2E crean una build de producción y ejecutan Playwright contra `dist` con un backend mock local. La documentacion completa esta en `docs/testing/`.

Para generar el informe PDF de pruebas:

```bash
npm run report:testing
```

Para generar el informe PDF de problemas detectados:

```bash
npm run report:problems
```

### SonarQube

```bash
npm run test:coverage
npm run sonar -- --define sonar.host.url=http://127.0.0.1:9000 --define sonar.token=<TOKEN>
```

El analisis requiere un servidor SonarQube accesible y un token valido.

## Estructura del proyecto

```text
FILMATE_UserFrontend/
├── public/
│   ├── favicon.png
│   ├── LogoTrans (2).png
│   ├── logo.png
│   └── otros assets estaticos
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── App.css
│   ├── assets/
│   └── Component/
│       ├── Header.jsx
│       ├── IniciarSesion.jsx
│       ├── Registro.jsx
│       ├── MenuPrincipal.jsx
│       ├── DetallePelicula.jsx
│       ├── Cines.jsx
│       ├── Dulceria.jsx
│       ├── Social.jsx
│       └── peliculas.js
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Rutas principales

- `/` -> Inicio de sesion
- `/registro` -> Registro de usuario
- `/menuPrincipal` -> Cartelera principal
- `/menuPrincipal/detallePelicula` -> Detalle de pelicula
- `/cines` -> Seccion de cines
- `/dulceria` -> Seccion de dulceria
- `/social` -> Seccion social

## Estrategia de ramas

Se usa una estrategia basada en ramas de trabajo y consolidacion:

- `main`: reservada exclusivamente para produccion.
- `develop`: linea base donde se integran las tareas del equipo.
- `feature/nombre-tarea`: ramas para desarrollar hitos o funcionalidades.
- `bugfix/nombre-error`: ramas para corregir fallos detectados en `develop`.

### Flujo recomendado

1. Crear una rama `feature/...` desde `develop`.
2. Desarrollar y probar la funcionalidad.
3. Abrir pull request hacia `develop`.
4. Validar y, cuando este estable, fusionar `develop` hacia `main`.

## Convenciones usadas

- Componentes de React organizados en `src/Component/`.
- Navegacion centralizada con `react-router-dom`.
- Estilos base con Tailwind CSS.
- Imagenes y assets publicos dentro de `public/`.

## Notas

- El proyecto usa rutas y componentes ya preparados para extender nuevas vistas.
- Si cambias nombres de imagenes en `public/`, recuerda actualizar sus referencias en los componentes.

