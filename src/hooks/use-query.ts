import { useEffect, useState, useCallback, useRef } from 'react';
import i18n from 'i18next';

interface UseQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
  isOffline?: boolean;
}

const isNetworkError = (err: unknown): boolean => {
  const message =
    err instanceof Error
      ? err.message
      : err !== null &&
          typeof err === 'object' &&
          'message' in err &&
          typeof err.message === 'string'
        ? err.message
        : '';
  const normalized = message.toLowerCase();

  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  );
};

/**
 * Generic hook for Supabase queries.
 * Wraps an async fetcher in loading/error/data state management.
 *
 * @param fetcher - Async function returning data
 * @param deps - Dependency array (re-fetches when deps change)
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOfflineState] = useState(false);
  const isOfflineRef = useRef(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const setIsOffline = (value: boolean) => {
    isOfflineRef.current = value;
    setIsOfflineState(value);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setData(result);
        setIsOffline(false);
      }
    } catch (err) {
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        if (isNetworkError(err)) {
          setError(
            i18n.t('shared.errors.network', {
              defaultValue:
                "We couldn't reach the server. Check your internet connection and try again.",
            })
          );
          setIsOffline(true);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : i18n.t('shared.errors.unknown', { defaultValue: 'An unknown error occurred' })
          );
          setIsOffline(false);
        }
      }
    } finally {
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    const handleOnline = () => {
      if (isOfflineRef.current) {
        void execute();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [execute]);

  return { data, error, loading, refetch: execute, isOffline };
}
