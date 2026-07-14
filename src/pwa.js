let deferredInstallPrompt = null;
let installTrackingInitialized = false;
const installPromptSubscribers = new Set();

const notifyInstallPromptSubscribers = () => {
  installPromptSubscribers.forEach((subscriber) => subscriber(deferredInstallPrompt));
};

export const initializePwaInstallTracking = () => {
  if (typeof window === 'undefined' || installTrackingInitialized) return;
  installTrackingInitialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    notifyInstallPromptSubscribers();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyInstallPromptSubscribers();
  });
};

export const getPwaInstallPrompt = () => deferredInstallPrompt;

export const clearPwaInstallPrompt = () => {
  deferredInstallPrompt = null;
  notifyInstallPromptSubscribers();
};

export const subscribeToPwaInstallPrompt = (subscriber) => {
  installPromptSubscribers.add(subscriber);
  return () => installPromptSubscribers.delete(subscriber);
};

export const registerServiceWorker = () => {
  initializePwaInstallTracking();

  if (
    typeof window === 'undefined'
    || !('serviceWorker' in navigator)
    || !import.meta.env.PROD
    || import.meta.env.VITE_DISABLE_SERVICE_WORKER === 'true'
  ) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('No se pudo registrar el service worker de Filmate.', error);
      }
    });
  });
};
