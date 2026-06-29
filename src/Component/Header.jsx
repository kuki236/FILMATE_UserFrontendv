import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, LogOut, Menu, ReceiptText, ShoppingBag, Ticket, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession, isRegisteredSession } from './authSession';
import { getUserPurchases } from './filmateApi';
import { getSessionUserId, PURCHASE_HISTORY_UPDATED, readPurchaseHistory } from './purchaseHistory';

const formatCurrency = (value) => `S/. ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha por definir';

  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function PurchaseDetail({ purchase }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
              {purchase.type || 'Compra Filmate'}
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {purchase.booking?.pelicula || 'Dulcería'}
            </h3>
            <p className="mt-1 text-sm font-semibold text-white/50">{formatDate(purchase.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white/45">Total</p>
            <p className="text-2xl font-black text-white">{formatCurrency(purchase.total)}</p>
          </div>
        </div>
      </section>

      {purchase.booking && (
        <section className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-200">Entradas</p>
          <p className="mt-2 font-black text-white">{purchase.booking.pelicula}</p>
          <p className="mt-1 text-sm font-semibold text-white/60">
            {[purchase.booking.sede, purchase.booking.horario, purchase.booking.sala].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/70">
            Asientos: {purchase.booking.asientos?.length ? purchase.booking.asientos.join(', ') : 'Sin asientos'}
          </p>
          <p className="mt-2 text-sm font-black text-sky-200">
            Subtotal entradas: {formatCurrency(purchase.booking.subtotal)}
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/45">Dulcería</p>
        {purchase.snacks?.length ? (
          <div className="mt-3 space-y-3">
            {purchase.snacks.map((item) => (
              <div key={`${item.id}-${item.nombre}`} className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <p className="font-bold text-white">{item.nombre}</p>
                  <p className="text-sm font-semibold text-white/45">
                    {item.cantidad} x {formatCurrency(item.precio)}
                  </p>
                </div>
                <p className="font-black text-white">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-white/50">Sin productos de dulcería en esta compra.</p>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm font-semibold text-white/60 sm:grid-cols-2">
        <div>
          <p className="text-white/35">Pedido</p>
          <p className="mt-1 text-white">#{purchase.pedidoNumber || purchase.id}</p>
        </div>
        <div>
          <p className="text-white/35">Transacción</p>
          <p className="mt-1 text-white">{purchase.transactionId ? `#${purchase.transactionId}` : 'No registrada'}</p>
        </div>
        <div>
          <p className="text-white/35">Método</p>
          <p className="mt-1 text-white">{purchase.method || 'Pago'}</p>
        </div>
        <div>
          <p className="text-white/35">QR</p>
          <p className="mt-1 truncate text-white">{purchase.qrValue || 'No disponible'}</p>
        </div>
      </section>

      {purchase.qrValue && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-xl bg-white p-3">
              <QRCodeCanvas
                value={purchase.qrValue}
                size={156}
                level="H"
                includeMargin
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>
            <div>
              <p className="text-base font-black text-white">Código QR de la compra</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-white/55">
                Presenta este QR en el cine para validar entradas o recoger productos de dulcería.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export const Header = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const sessionUserId = getSessionUserId(session);

  const isActive = (path) => {
    if (path === '/social') return location.pathname.startsWith('/social');
    if (path === '/menuPrincipal') return location.pathname.startsWith('/menuPrincipal');
    return location.pathname === path;
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/');
    setShowLogoutModal(false);
  };

  const canSeeSocial = isRegisteredSession();
  const latestPurchases = useMemo(() => purchases.slice(0, 3), [purchases]);

  useEffect(() => {
    let active = true;
    const loadPurchases = async () => {
      const localPurchases = readPurchaseHistory(sessionUserId);
      setPurchases(localPurchases);

      try {
        const remotePurchases = await getUserPurchases(sessionUserId);
        if (!active) return;
        setPurchases(remotePurchases.length ? remotePurchases : localPurchases);
      } catch {
        if (active) setPurchases(localPurchases);
      }
    };

    loadPurchases();
    window.addEventListener(PURCHASE_HISTORY_UPDATED, loadPurchases);
    window.addEventListener('storage', loadPurchases);

    return () => {
      active = false;
      window.removeEventListener(PURCHASE_HISTORY_UPDATED, loadPurchases);
      window.removeEventListener('storage', loadPurchases);
    };
  }, [sessionUserId]);

  const navItems = [
    { path: '/menuPrincipal', label: 'Cartelera' },
    { path: '/cines', label: 'Cines' },
    { path: '/dulceria', label: 'Dulcería' },
    { path: '/social', label: 'Social' },
  ].filter((item) => canSeeSocial || item.path !== '/social');

  const openPurchaseDetail = (purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchases(false);
    setShowAllPurchases(false);
  };

  const closePurchaseModals = () => {
    setSelectedPurchase(null);
    setShowAllPurchases(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center">
            <div className="flex min-w-[3rem] items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <img
                  src="/favicon.png"
                  alt="Filmate Logo"
                  className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 object-contain"
                />
              </div>
            </div>

            <div className="flex flex-1 justify-center">
              <div className="hidden items-center gap-12 md:flex">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <button
                      className={`border-b-2 pb-1 text-lg font-semibold transition-all duration-300 ${
                        isActive(item.path)
                          ? 'border-[#1F5FA7] text-white'
                          : 'border-transparent text-white hover:border-[#FF213A]'
                      }`}
                    >
                      {item.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex min-w-[3rem] items-center justify-end gap-3">
              <button
                aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={mobileOpen}
                className="rounded-full p-2 transition-colors hover:bg-slate-800 md:hidden"
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
              </button>

              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setShowPurchases((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-sky-400 hover:bg-slate-800"
                >
                  <ShoppingBag className="h-4 w-4 text-sky-200" />
                  Mis compras
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPurchases ? 'rotate-180' : ''}`} />
                </button>

                {showPurchases && (
                  <div className="absolute right-0 top-full z-[60] mt-3 w-[25rem] overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
                    <div className="border-b border-slate-800 px-4 py-3">
                      <p className="text-base font-black text-white">Mis compras</p>
                      <p className="text-xs font-semibold text-white/45">Últimas 3 compras realizadas</p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {latestPurchases.length > 0 ? (
                        latestPurchases.map((purchase) => (
                          <button
                            key={purchase.id}
                            type="button"
                            onClick={() => openPurchaseDetail(purchase)}
                            className="flex w-full gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-900"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-200">
                              {purchase.booking ? <Ticket className="h-6 w-6" /> : <ReceiptText className="h-6 w-6" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-white">
                                {purchase.booking?.pelicula || purchase.type || 'Compra Filmate'}
                              </p>
                              <p className="mt-1 truncate text-xs font-semibold text-white/50">
                                {purchase.booking
                                  ? `${purchase.booking.sede || 'Sede'} · ${purchase.booking.asientos?.length || 0} asiento(s)`
                                  : `${purchase.snacks?.length || 0} producto(s) de dulcería`}
                              </p>
                              <p className="mt-1 text-xs font-bold text-sky-200">{formatDate(purchase.createdAt)}</p>
                            </div>
                            <p className="shrink-0 text-sm font-black text-white">{formatCurrency(purchase.total)}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm font-semibold text-white/50">
                          Aún no hay compras registradas.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAllPurchases(true);
                        setShowPurchases(false);
                      }}
                      className="w-full border-t border-slate-800 px-4 py-3 text-center text-sm font-bold text-sky-300 transition-colors hover:bg-slate-900"
                    >
                      Ver todas mis compras
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="hidden transform items-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40 sm:flex sm:px-5 sm:text-base"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-2 px-4 py-3">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                  <button
                    className={`w-full rounded-lg px-3 py-2 text-left text-base font-semibold transition-all duration-200 ${
                      isActive(item.path) ? 'bg-[#1F5FA7] text-white' : 'text-gray-200 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}

              <button
                onClick={() => {
                  setMobileOpen(false);
                  setShowAllPurchases(true);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-base font-semibold text-gray-200 transition-all duration-200 hover:bg-slate-800"
              >
                Mis compras
              </button>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  setShowLogoutModal(true);
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-800 p-8 shadow-2xl animate-scaleIn">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <LogOut className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-white">¿Cerrar sesión?</h2>
              <p className="mb-8 text-gray-400">¿Estás seguro que deseas cerrar tu sesión en Filmate?</p>
              <div className="flex w-full gap-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 rounded-full bg-slate-700 px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-full bg-red-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(selectedPurchase || showAllPurchases) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">Filmate</p>
                <h2 className="text-xl font-black">{selectedPurchase ? 'Detalle de compra' : 'Todas mis compras'}</h2>
              </div>
              <button
                type="button"
                onClick={closePurchaseModals}
                className="rounded-full p-2 text-white/70 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
              {selectedPurchase ? (
                <PurchaseDetail purchase={selectedPurchase} />
              ) : purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <button
                      key={purchase.id}
                      type="button"
                      onClick={() => openPurchaseDetail(purchase)}
                      className="flex w-full items-center gap-4 rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3 text-left transition-colors hover:border-sky-500/50"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-200">
                        {purchase.booking ? <Ticket className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black">{purchase.booking?.pelicula || purchase.type || 'Compra Filmate'}</p>
                        <p className="mt-1 text-xs font-semibold text-white/45">{formatDate(purchase.createdAt)}</p>
                      </div>
                      <p className="font-black">{formatCurrency(purchase.total)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center text-white/55">
                  Aún no hay compras registradas.
                </div>
              )}
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
