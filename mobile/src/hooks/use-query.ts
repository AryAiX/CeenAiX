import { useCallback, useEffect, useRef, useState } from 'react';
import { readCache, writeCache } from '@/lib/query-cache';

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  /** ISO timestamp of the cached value currently shown, when it came from cache and the live fetch failed. */
  staleSince: string | null;
  refetch: () => Promise<void>;
  setData: (updater: (current: T | null) => T | null) => void;
}

const toMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

/**
 * Same loading/error/data contract as the web `useQuery`, plus an optional
 * per-user cache key that hydrates the last good result before fetching.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: { cacheKey?: string | null; enabled?: boolean } = {}
): QueryResult<T> {
  const { cacheKey = null, enabled = true } = options;
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [staleSince, setStaleSince] = useState<string | null>(null);
  const requestId = useRef(0);
  const mounted = useRef(true);
  const hasData = useRef(false);
  const cachedAt = useRef<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      if (mode === 'refresh') setRefreshing(true);
      else if (!hasData.current) setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (!mounted.current || id !== requestId.current) return;
        hasData.current = true;
        cachedAt.current = null;
        setDataState(result);
        setStaleSince(null);
        if (cacheKey) void writeCache(cacheKey, result);
      } catch (err) {
        if (!mounted.current || id !== requestId.current) return;
        setError(toMessage(err));
        setStaleSince(cachedAt.current);
      } finally {
        if (mounted.current && id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cacheKey, enabled, ...deps]
  );

  useEffect(() => {
    let cancelled = false;
    hasData.current = false;
    cachedAt.current = null;
    void (async () => {
      if (cacheKey) {
        const cached = await readCache<T>(cacheKey);
        if (!cancelled && cached && !hasData.current) {
          hasData.current = true;
          cachedAt.current = cached.savedAt;
          setDataState(cached.value);
          setLoading(false);
        }
      }
      if (!cancelled) await execute('initial');
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, execute]);

  const refetch = useCallback(() => execute('refresh'), [execute]);
  const setData = useCallback((updater: (current: T | null) => T | null) => setDataState(updater), []);

  return { data, error, loading, refreshing, staleSince, refetch, setData };
}
