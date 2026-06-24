import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { clearAuthSession, isRegisteredSession } from './authSession';

export const Header = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/social') return location.pathname.startsWith('/social');
    if (path === '/menuPrincipal') return location.pathname.startsWith('/menuPrincipal');
    return location.pathname === path;
  };

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    clearAuthSession();
    navigate('/');
    setShowLogoutModal(false);
  };

  const canSeeSocial = isRegisteredSession();

  const navItems = [
    { path: '/menuPrincipal', label: 'Cartelera' },
    { path: '/cines', label: 'Cines' },
    { path: '/dulceria', label: 'Dulcería' },
    { path: '/social', label: 'Social' },
  ].filter((item) => canSeeSocial || item.path !== '/social');

  return (
    <>
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">

            {/* Columna izquierda: Logo */}
            <div className="flex items-center gap-3 min-w-[3rem]">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <img
                  src="/favicon.png"
                  alt="Filmate Logo"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 object-contain"
                />
              </div>
            </div>

            {/* Columna centro: Menú (siempre centrado) */}
            <div className="flex-1 flex justify-center">
              <div className="hidden md:flex gap-12 items-center">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <button
                      className={`text-lg font-semibold transition-all duration-300 pb-1 border-b-2 ${
                        isActive(item.path)
                          ? 'text-white border-[#1F5FA7]'
                          : 'text-white border-transparent hover:border-[#FF213A]'
                      }`}
                    >
                      {item.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Columna derecha: menú móvil + cerrar sesión */}
            <div className="flex items-center gap-3 justify-end min-w-[3rem]">
              {/* Botón hamburguesa (solo móvil) */}
              <button
                aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-full hover:bg-slate-800 transition-colors"
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Botón Cerrar Sesión (oculto en xs) */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm sm:text-base font-semibold rounded-full transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-105"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900/95 backdrop-blur-xl">
            <div className="px-4 py-3 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                >
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-base font-semibold transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-[#1F5FA7] text-white'
                        : 'text-gray-200 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}

              {/* Cerrar sesión también en móvil */}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setShowLogoutModal(true);
                }}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Modal de Cerrar Sesión */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 max-w-md w-full mx-4 animate-scaleIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                ¿Cerrar sesión?
              </h2>

              <p className="text-gray-400 mb-8">
                ¿Estás seguro que deseas cerrar tu sesión en Filmate?
              </p>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-full transition-all duration-300"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleLogout}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Header;
