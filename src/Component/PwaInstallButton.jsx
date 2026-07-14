import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import PropTypes from 'prop-types';
import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  initializePwaInstallTracking,
  subscribeToPwaInstallPrompt,
} from '../pwa.js';

const isStandaloneMode = () => (
  typeof window !== 'undefined'
  && (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true
  )
);

const isIosDevice = () => (
  typeof navigator !== 'undefined'
  && /iphone|ipad|ipod/i.test(navigator.userAgent)
);

function PwaInstallButton({ variant = 'default', onBeforeInstall }) {
  const [installPrompt, setInstallPrompt] = useState(getPwaInstallPrompt);
  const [installed, setInstalled] = useState(isStandaloneMode);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const iosDevice = isIosDevice();

  useEffect(() => {
    initializePwaInstallTracking();
    const unsubscribe = subscribeToPwaInstallPrompt(setInstallPrompt);
    const handleInstalled = () => {
      setInstalled(true);
      setShowIosHelp(false);
    };
    const displayMode = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;
    const handleDisplayMode = (event) => {
      if (event.matches) handleInstalled();
    };

    window.addEventListener('appinstalled', handleInstalled);
    displayMode?.addEventListener?.('change', handleDisplayMode);

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode?.removeEventListener?.('change', handleDisplayMode);
    };
  }, []);

  if (installed || (!installPrompt && !iosDevice)) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowIosHelp(true);
      onBeforeInstall?.();
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    clearPwaInstallPrompt();
    onBeforeInstall?.();
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  const triggerClassName = variant === 'header'
    ? 'inline-flex items-center gap-2 rounded-full border border-sky-400/45 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200 transition-colors hover:bg-sky-500/20'
    : variant === 'menu'
      ? 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-sky-200 transition-colors hover:bg-sky-500/10'
      : 'mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-4 py-3 font-bold text-sky-200 transition-colors hover:bg-sky-500/20';

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={triggerClassName}
        aria-label="Instalar Filmate"
      >
        <Download className="h-5 w-5" />
        {variant === 'header' ? <span className="hidden xl:inline">Instalar</span> : 'Instalar Filmate'}
      </button>

      {showIosHelp && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
          <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Instalar en iPhone</p>
                <h2 id="ios-install-title" className="mt-2 text-xl font-black">Añade Filmate a tu inicio</h2>
              </div>
              <button type="button" onClick={() => setShowIosHelp(false)} aria-label="Cerrar instrucciones" className="rounded-full p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-5 space-y-4 text-sm font-semibold text-slate-200">
              <li className="flex items-center gap-3 rounded-2xl bg-slate-800/80 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300"><Share className="h-5 w-5" /></span>
                En Safari, pulsa el botón Compartir.
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-slate-800/80 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300"><SquarePlus className="h-5 w-5" /></span>
                Selecciona “Añadir a pantalla de inicio”.
              </li>
            </ol>

            <button type="button" onClick={() => setShowIosHelp(false)} className="mt-5 w-full rounded-full bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-600">
              Entendido
            </button>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

PwaInstallButton.propTypes = {
  variant: PropTypes.oneOf(['default', 'header', 'menu']),
  onBeforeInstall: PropTypes.func,
};

export default PwaInstallButton;
