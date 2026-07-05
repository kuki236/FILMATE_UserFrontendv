import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  invalidateHomeRecommendationsCache,
  useHomeRecommendations,
} from './useHomeRecommendations.js';
import { getHomeRecommendations } from '../filmateApi.js';
import { clearAuthSession, saveRegisteredSession } from '../authSession.js';

vi.mock('../filmateApi.js', () => ({
  getHomeRecommendations: vi.fn(),
}));

const setSession = (user, token) => {
  if (!user) {
    clearAuthSession();
    return;
  }
  saveRegisteredSession(user, token);
};

const samplePayload = (recomendaciones, signals = {}) => ({
  user_id: 1,
  total: recomendaciones.length,
  recomendaciones,
  signals: {
    peliculas_favoritas_count: 3,
    resenas_5_estrellas_count: 2,
    compras_analizadas: 5,
    ...signals,
  },
});

describe('useHomeRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthSession();
    invalidateHomeRecommendationsCache();
  });

  afterEach(() => {
    clearAuthSession();
    invalidateHomeRecommendationsCache();
  });

  it('does not fetch when the user is a guest', async () => {
    setSession(null);

    const { result } = renderHook(() => useHomeRecommendations({ limit: 5 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHomeRecommendations).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('fetches personalized recommendations for a registered user', async () => {
    setSession({ id_usuario: 7, username: 'cine' }, 'jwt.token');
    const payload = samplePayload([
      { id_pelicula: 11, titulo: 'Dune: Part Two', url_poster: 'poster.jpg', director: 'Denis Villeneuve' },
      { id_pelicula: 22, titulo: 'Interestelar', url_poster: 'poster2.jpg', director: 'Christopher Nolan' },
    ]);

    getHomeRecommendations.mockResolvedValueOnce(payload);

    const { result } = renderHook(() => useHomeRecommendations({ limit: 5 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHomeRecommendations).toHaveBeenCalledWith({
      token: 'jwt.token',
      limit: 5,
      signal: expect.anything(),
    });
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]).toMatchObject({ id_pelicula: 11, titulo: 'Dune: Part Two' });
    expect(result.current.signals).toMatchObject({ peliculas_favoritas_count: 3 });
  });

  it('exposes the error when the API rejects', async () => {
    setSession({ id_usuario: 8 }, 'jwt.token');
    const failure = new Error('recommendations_error_500');
    getHomeRecommendations.mockRejectedValueOnce(failure);

    const { result } = renderHook(() => useHomeRecommendations({ limit: 5 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(failure);
  });

  it('reuses cached results when invalidate is not called', async () => {
    setSession({ id_usuario: 9 }, 'jwt.token');
    const payload = samplePayload([{ id_pelicula: 1, titulo: 'Demo' }]);
    getHomeRecommendations.mockResolvedValueOnce(payload);

    const first = renderHook(() => useHomeRecommendations({ limit: 5 }));
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    first.unmount();

    const second = renderHook(() => useHomeRecommendations({ limit: 5 }));
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    expect(getHomeRecommendations).toHaveBeenCalledTimes(1);
    expect(second.result.current.data).toHaveLength(1);
  });

  it('refetches when the global invalidation event fires', async () => {
    setSession({ id_usuario: 10 }, 'jwt.token');
    const payload = samplePayload([{ id_pelicula: 99, titulo: 'Refetch' }]);
    getHomeRecommendations.mockResolvedValue(payload);

    const { result } = renderHook(() => useHomeRecommendations({ limit: 5 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getHomeRecommendations).toHaveBeenCalledTimes(1);

    await act(async () => {
      invalidateHomeRecommendationsCache();
    });

    await waitFor(() => expect(getHomeRecommendations).toHaveBeenCalledTimes(2));
  });
});
