import { describe, expect, it } from 'vitest';
import {
  clearAuthSession,
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

    saveRegisteredSession(user);

    expect(getAuthSession()).toEqual({ mode: 'registered', user });
    expect(isRegisteredSession()).toBe(true);
    expect(isGuestSession()).toBe(false);
  });

  it('clears persisted auth data', () => {
    saveGuestSession();
    clearAuthSession();

    expect(getAuthSession()).toBeNull();
  });

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('filmate_auth_session', '{bad-json');

    expect(getAuthSession()).toBeNull();
    expect(isRegisteredSession()).toBe(false);
  });
});
