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

- Node.js 18 o superior
- npm 9 o superior

## Instalacion

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

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

Las pruebas unitarias e integracion usan Vitest y Testing Library. Las E2E usan Playwright con un backend mock local. La documentacion completa esta en `docs/testing/`.

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

