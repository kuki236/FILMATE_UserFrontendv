const AUTH_KEY = 'filmate_auth_session';

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  const session = getAuthSession();
  if (!session) return null;
  const token = session.token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function isGuestSession() {
  return getAuthSession()?.mode === 'guest';
}

export function isRegisteredSession() {
  return getAuthSession()?.mode === 'registered';
}

export function saveGuestSession() {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      mode: 'guest',
      user: null,
      token: null,
    })
  );
}

export function saveRegisteredSession(user, token = null) {
  const sanitizedToken = typeof token === 'string' && token.trim() ? token.trim() : null;

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      mode: 'registered',
      user,
      token: sanitizedToken,
    })
  );
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}
