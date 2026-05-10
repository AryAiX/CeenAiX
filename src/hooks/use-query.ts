import { useEffect, useState, useCallback, useRef } from 'react';
import i18n from 'i18next';

interface UseQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

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
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

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
      }
    } catch (err) {
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : i18n.t('shared.errors.unknown', { defaultValue: 'An unknown error occurred' })
        );
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

  return { data, error, loading, refetch: execute };
}
