import { useEffect, useState } from 'react';
import { readCache, writeCache } from '@/lib/query-cache';

interface QueryLike<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export type Cached<R extends QueryLike<unknown>> = Omit<R, 'data'> & {
  data: R['data'];
  /** ISO time of the cached copy being shown because the live fetch failed. */
  staleSince: string | null;
};

/**
 * Last-fetch offline cache for any `useQuery`-shaped hook (including the
 * generated web hooks): persists successful results per key and serves the
 * cached copy while loading or when the network request fails.
 */
export function useOfflineCache<T, R extends QueryLike<T>>(result: R, key: string | null): Cached<R> {
  const [cached, setCached] = useState<{ key: string; value: T; savedAt: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!key) return;
    void readCache<T>(key).then((entry) => {
      if (active && entry) setCached({ key, value: entry.value, savedAt: entry.savedAt });
    });
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (key && result.data !== null && !result.loading && !result.error) void writeCache(key, result.data);
  }, [key, result.data, result.error, result.loading]);

  const usable = cached && cached.key === key ? cached : null;
  const live = result.data !== null && !result.error;
  return {
    ...result,
    data: (live ? result.data : result.data ?? usable?.value ?? null) as R['data'],
    loading: result.loading && !usable && result.data === null,
    staleSince: !live && usable && result.error ? usable.savedAt : null,
  };
}
