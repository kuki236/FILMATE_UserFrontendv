import { describe, expect, it } from 'vitest';
import {
  clearAuthSession,
  getAuthSession,
  getAuthToken,
  isGuestSession,
  isRegisteredSession,
  saveGuestSession,
  saveRegisteredSession,
} from './authSession';

describe('authSession', () => {
  it('stores and reads a guest session', () => {
    saveGuestSession();

    expect(getAuthSession()).toEqual({ mode: 'guest', user: null, token: null });
    expect(getAuthToken()).toBeNull();
    expect(isGuestSession()).toBe(true);
    expect(isRegisteredSession()).toBe(false);
  });

  it('stores and reads a registered session without a token', () => {
    const user = { id_usuario: 42, username: 'andrea', correo: 'a@filmate.test' };

    saveRegisteredSession(user);

    expect(getAuthSession()).toEqual({ mode: 'registered', user, token: null });
    expect(getAuthToken()).toBeNull();
    expect(isRegisteredSession()).toBe(true);
    expect(isGuestSession()).toBe(false);
  });

  it('persists a JWT when present and exposes it via getAuthToken', () => {
    const user = { id_usuario: 7, username: 'majo' };

    saveRegisteredSession(user, 'jwt.fake.token');

    expect(getAuthSession()).toEqual({ mode: 'registered', user, token: 'jwt.fake.token' });
    expect(getAuthToken()).toBe('jwt.fake.token');
  });

  it('ignores blank or non-string tokens', () => {
    const user = { id_usuario: 8 };

    saveRegisteredSession(user, '   ');
    expect(getAuthToken()).toBeNull();

    saveRegisteredSession(user, 123);
    expect(getAuthToken()).toBeNull();
  });

  it('clears persisted auth data', () => {
    saveGuestSession();
    clearAuthSession();

    expect(getAuthSession()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('filmate_auth_session', '{bad-json');

    expect(getAuthSession()).toBeNull();
    expect(getAuthToken()).toBeNull();
    expect(isRegisteredSession()).toBe(false);
  });
});
