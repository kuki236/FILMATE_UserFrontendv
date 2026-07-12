const AUTH_KEY = 'filmate_auth_session';

const removeLegacyAuthSession = () => {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // Legacy storage can be unavailable in hardened browser contexts.
  }
};

export function getAuthSession() {
  let raw;
  let migratedFromLegacyStorage = false;

  try {
    raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) {
      raw = localStorage.getItem(AUTH_KEY);
      migratedFromLegacyStorage = Boolean(raw);
    }

    const session = raw ? JSON.parse(raw) : null;
    if (session && migratedFromLegacyStorage) {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
      removeLegacyAuthSession();
    }

    return session;
  } catch {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }
    return null;
  }
}

export function isGuestSession() {
  return getAuthSession()?.mode === 'guest';
}

export function isRegisteredSession() {
  const session = getAuthSession();
  return session?.mode === 'registered' && Boolean(session.accessToken);
}

export function getAccessToken() {
  return getAuthSession()?.accessToken || null;
}

export function saveGuestSession() {
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      mode: 'guest',
      user: null,
    })
  );
  removeLegacyAuthSession();
}

export function saveRegisteredSession(user, accessToken = getAccessToken()) {
  const session = {
    mode: 'registered',
    user,
  };

  if (accessToken) {
    session.accessToken = accessToken;
  }

  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  removeLegacyAuthSession();
}

export function clearAuthSession() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('filmate-booking-context');
    sessionStorage.removeItem('filmate-dulceria-pedido');
    sessionStorage.removeItem('filmate-dulceria-fecha');
  } catch {
    // The session is already inaccessible if sessionStorage is blocked.
  }
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // The legacy session is already inaccessible if localStorage is blocked.
  }
}
