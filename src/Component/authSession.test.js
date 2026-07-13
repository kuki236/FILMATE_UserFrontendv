import { describe, expect, it } from 'vitest';
import {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  isGuestSession,
  isRegisteredSession,
  saveGuestSession,
  saveRegisteredSession,
} from './authSession';

describe('authSession', () => {
  it('stores and reads a guest session', () => {
    saveGuestSession();

    expect(getAuthSession()).toEqual({ mode: 'guest', user: null });
    expect(isGuestSession()).toBe(true);
    expect(isRegisteredSession()).toBe(false);
  });

  it('stores and reads a registered session', () => {
    const user = { id_usuario: 42, username: 'andrea', correo: 'a@filmate.test' };

    saveRegisteredSession(user, 'jwt-demo');

    expect(getAuthSession()).toEqual({ mode: 'registered', user, accessToken: 'jwt-demo' });
    expect(isRegisteredSession()).toBe(true);
    expect(isGuestSession()).toBe(false);
  });

  it('does not treat a tokenless local record as an authenticated session', () => {
    saveRegisteredSession({ id_usuario: 42, username: 'andrea' }, null);

    expect(isRegisteredSession()).toBe(false);
  });

  it('stores an access token and preserves it when the profile changes', () => {
    saveRegisteredSession({ id_usuario: 42, username: 'andrea' }, 'jwt-demo');
    saveRegisteredSession({ id_usuario: 42, username: 'andrea-editada' });

    expect(getAccessToken()).toBe('jwt-demo');
    expect(getAuthSession()).toMatchObject({
      accessToken: 'jwt-demo',
      user: { username: 'andrea-editada' },
    });
  });

  it('clears persisted auth data', () => {
    saveGuestSession();
    clearAuthSession();

    expect(getAuthSession()).toBeNull();
  });

  it('returns null when localStorage contains invalid JSON', () => {
    sessionStorage.setItem('filmate_auth_session', '{bad-json');

    expect(getAuthSession()).toBeNull();
    expect(isRegisteredSession()).toBe(false);
  });

  it('moves a legacy localStorage session into sessionStorage', () => {
    localStorage.setItem('filmate_auth_session', JSON.stringify({
      mode: 'registered',
      user: { id_usuario: 42 },
      accessToken: 'legacy-token',
    }));

    expect(getAccessToken()).toBe('legacy-token');
    expect(localStorage.getItem('filmate_auth_session')).toBeNull();
    expect(sessionStorage.getItem('filmate_auth_session')).toContain('legacy-token');
  });
});
