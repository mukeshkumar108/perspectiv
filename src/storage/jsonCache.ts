import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

const PREFIX = 'perspectiv.cache.';

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // The cache is a convenience; failing to write it never matters.
  }
}

/**
 * A query that shows its last good answer straight away while the fresh one loads, and keeps that answer on the phone.
 * A screen that was loaded once is never empty or "loading" again just because the network or the login was slow.
 */
export function useCachedQuery<T>(cacheKey: string, options: UseQueryOptions<T, Error, T, QueryKey>) {
  const [cached, setCached] = useState<T | undefined>(undefined);

  useEffect(() => {
    let live = true;
    readCache<T>(cacheKey).then((value) => {
      if (live && value !== null) setCached(value);
    });
    return () => {
      live = false;
    };
  }, [cacheKey]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = useQuery<T, Error, T, QueryKey>({ ...options, placeholderData: (cached ?? options.placeholderData) as any });

  useEffect(() => {
    if (query.data !== undefined && !query.isPlaceholderData) void writeCache(cacheKey, query.data);
  }, [cacheKey, query.data, query.isPlaceholderData]);

  const data = query.data ?? cached;
  return { ...query, data, isLoading: query.isLoading && data === undefined };
}
