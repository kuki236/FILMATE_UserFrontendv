import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Link, Routes, Route } from 'react-router-dom';
import './App.css';
import AppErrorBoundary from './Component/AppErrorBoundary.jsx';
import ProtectedRoute from './Component/ProtectedRoute.jsx';

const IniciarSesion = lazy(() => import('./Component/IniciarSesion.jsx'));
const MenuPrincipal = lazy(() => import('./Component/MenuPrincipal.jsx'));
const Registro = lazy(() => import('./Component/Registro.jsx'));
const Cines = lazy(() => import('./Component/Cines.jsx'));
const Dulceria = lazy(() => import('./Component/Dulceria.jsx'));
const Social = lazy(() => import('./Component/Social.jsx'));
const SocialEditarPerfil = lazy(() => import('./Component/SocialEditarPerfil.jsx'));
const SocialPelicula = lazy(() => import('./Component/SocialPelicula.jsx'));
const DetallePelicula = lazy(() => import('./Component/DetallePelicula.jsx'));

const PageLoader = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white" aria-live="polite">
    <h1 className="sr-only">Filmate</h1>
    <p className="font-semibold text-slate-300">Cargando Filmate…</p>
  </main>
);

const NotFound = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
    <section className="text-center">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">Error 404</p>
      <h1 className="mt-3 text-4xl font-black">Esta página no existe</h1>
      <Link to="/menuPrincipal" className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700">
        Ir a la cartelera
      </Link>
    </section>
  </main>
);

function App() {
  return (
    <Router>
      <AppErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/" element={<IniciarSesion />} />
        <Route path="/menuPrincipal" element={<MenuPrincipal />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/cines" element={<Cines />} />
        <Route path="/dulceria" element={<Dulceria />} />
        <Route
          path="/social"
          element={
            <ProtectedRoute requireRegistered>
              <Social />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social/:profileUserId"
          element={
            <ProtectedRoute requireRegistered>
              <Social />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social/editarPerfil"
          element={
            <ProtectedRoute requireRegistered>
              <SocialEditarPerfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social/pelicula/:movieId"
          element={
            <ProtectedRoute requireRegistered>
              <SocialPelicula />
            </ProtectedRoute>
          }
        />
        <Route path="/menuPrincipal/detallePelicula/:movieId?" element={<DetallePelicula />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </AppErrorBoundary>
    </Router>
  );
}

export default App;
