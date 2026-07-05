import { useCallback, useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';
import { getHomeRecommendations } from '../filmateApi.js';
import { getAuthSession, getAuthToken, isRegisteredSession } from '../authSession.js';

export const RECOMMENDATIONS_INVALIDATED_EVENT = 'filmate:recommendations-invalidated';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const EMPTY_ENTRY = Object.freeze({
  data: { recomendaciones: [], signals: null, userId: null, total: 0, fetchedAt: 0 },
  expiresAt: 0,
});

const cache = new Map();
const subscribers = new Set();

const notify = () => {
  for (const callback of subscribers) {
    callback();
  }
};

const buildCacheKey = (userId, limit) => `${userId || 'guest'}|${limit}`;

const readCacheEntry = (key) => {
  const entry = cache.get(key);
  if (!entry) return EMPTY_ENTRY;

  if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
    cache.delete(key);
    return EMPTY_ENTRY;
  }

  return entry;
};

const writeCacheEntry = (key, data, ttlMs) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  notify();
};

const subscribeToCache = (callback) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

const getServerSnapshot = () => EMPTY_ENTRY;

export const invalidateHomeRecommendationsCache = (userId = null) => {
  if (!userId) {
    cache.clear();
  } else {
    const prefix = `${userId}|`;
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }

  notify();

  if (typeof globalThis.window !== 'undefined') {
    globalThis.window.dispatchEvent(new CustomEvent(RECOMMENDATIONS_INVALIDATED_EVENT));
  }
};

const getSessionUserId = (session) =>
  session?.user?.id_usuario || session?.user?.id || session?.user?.user_id || null;

const initialStatus = { loading: false, error: null };

function statusReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { loading: true, error: null };
    case 'SUCCESS':
      return { loading: false, error: null };
    case 'ERROR':
      return { loading: false, error: action.error };
    case 'RESET':
      return { loading: false, error: null };
    default:
      return state;
  }
}

export function useHomeRecommendations({ limit = 10, ttlMs = DEFAULT_TTL_MS, autoFetch = true } = {}) {
  const session = useMemo(() => (autoFetch ? getAuthSession() : null), [autoFetch]);
  const isRegistered = isRegisteredSession();
  const token = getAuthToken();
  const userId = useMemo(() => getSessionUserId(session), [session]);

  const cacheKey = useMemo(() => buildCacheKey(userId, limit), [userId, limit]);
  const entry = useSyncExternalStore(subscribeToCache, () => readCacheEntry(cacheKey), getServerSnapshot);

  const recomendaciones = entry.data?.recomendaciones ?? [];
  const signals = entry.data?.signals ?? null;
  const hasCache = entry !== EMPTY_ENTRY;

  const [status, dispatch] = useReducer(statusReducer, initialStatus);

  const fetchRecommendations = useCallback(
    async ({ signal, force = false } = {}) => {
      if (!isRegistered || !token) {
        dispatch({ type: 'RESET' });
        return null;
      }

      if (!force && hasCache) {
        dispatch({ type: 'RESET' });
        return entry.data;
      }

      dispatch({ type: 'START' });

      try {
        const response = await getHomeRecommendations({ token, limit, signal });
        const recomendacionesList = Array.isArray(response?.recomendaciones) ? response.recomendaciones : [];

        const payload = {
          recomendaciones: recomendacionesList,
          signals: response?.signals ?? null,
          userId: response?.userId ?? null,
          total: response?.total ?? recomendacionesList.length,
          fetchedAt: Date.now(),
        };

        writeCacheEntry(cacheKey, payload, ttlMs);
        dispatch({ type: 'SUCCESS' });
        return payload;
      } catch (err) {
        if (err?.name === 'AbortError') {
          return null;
        }

        dispatch({ type: 'ERROR', error: err });
        return null;
      }
    },
    [cacheKey, entry, hasCache, isRegistered, limit, token, ttlMs]
  );

  useEffect(() => {
    if (!autoFetch) return undefined;
    if (hasCache) {
      dispatch({ type: 'RESET' });
      return undefined;
    }
    if (!isRegistered || !token) {
      dispatch({ type: 'RESET' });
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    let dispatchedStart = false;

    const run = async () => {
      try {
        if (active) {
          dispatchedStart = true;
          dispatch({ type: 'START' });
        }

        const response = await getHomeRecommendations({ token, limit, signal: controller.signal });
        if (!active) return;

        const recomendacionesList = Array.isArray(response?.recomendaciones) ? response.recomendaciones : [];
        const payload = {
          recomendaciones: recomendacionesList,
          signals: response?.signals ?? null,
          userId: response?.userId ?? null,
          total: response?.total ?? recomendacionesList.length,
          fetchedAt: Date.now(),
        };

        writeCacheEntry(cacheKey, payload, ttlMs);
        dispatch({ type: 'SUCCESS' });
      } catch (err) {
        if (err?.name === 'AbortError' || !active) return;
        dispatch({ type: 'ERROR', error: err });
      }
    };

    run();

    return () => {
      active = false;
      if (dispatchedStart) {
        dispatch({ type: 'RESET' });
      }
      controller.abort();
    };
  }, [autoFetch, cacheKey, hasCache, isRegistered, limit, token, ttlMs]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return undefined;
    if (autoFetch) return undefined;

    const handler = () => {
      const controller = new AbortController();
      fetchRecommendations({ signal: controller.signal, force: true }).finally(() => controller.abort());
    };

    globalThis.window.addEventListener(RECOMMENDATIONS_INVALIDATED_EVENT, handler);
    return () => {
      globalThis.window.removeEventListener(RECOMMENDATIONS_INVALIDATED_EVENT, handler);
    };
  }, [autoFetch, cacheKey, fetchRecommendations]);

  const invalidate = useCallback(() => invalidateHomeRecommendationsCache(userId), [userId]);

  return {
    data: recomendaciones,
    loading: status.loading,
    error: status.error,
    signals,
    userId,
    isRegistered,
    refresh: fetchRecommendations,
    invalidate,
  };
}

export default useHomeRecommendations;
