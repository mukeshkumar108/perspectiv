import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import type { TodayResponse } from '../api/schemas';
import { queryKeys } from '../state';
import { getTodayCache, updateTodayCacheFromApi, getLocalDateKey } from '../storage';

export function useToday() {
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  useEffect(() => {
    getTodayCache().then((cache) => {
      if (!cache) return;
      if (cache.dateLocal !== getLocalDateKey()) return;
      queryClient.setQueryData(queryKeys.today, (prev: any) => ({
        ...(prev ?? {}),
        dateLocal: cache.dateLocal,
        hasMood: cache.hasMood ?? prev?.hasMood,
        moodRating: cache.moodRating ?? prev?.moodRating,
        hasReflected: cache.hasReflected ?? prev?.hasReflected,
        prompt: prev?.prompt || (cache.lastPromptText
          ? { id: 'local', text: cache.lastPromptText }
          : undefined),
      }));
    });
  }, [queryClient]);

  const query = useQuery<TodayResponse>({
    queryKey: queryKeys.today,
    queryFn: () => api.getToday(),
    enabled: authReady,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  useEffect(() => {
    if (!query.data) return;
    updateTodayCacheFromApi(query.data).then((cache) => {
      queryClient.setQueryData(queryKeys.today, (prev: any) => ({
        ...(prev ?? {}),
        ...query.data,
        hasMood: cache.hasMood ?? query.data?.hasMood,
        hasReflected: cache.hasReflected ?? query.data?.hasReflected,
        moodRating: cache.moodRating ?? (prev?.moodRating ?? null),
        prompt: query.data?.prompt || prev?.prompt,
      }));
    });
  }, [query.data, queryClient]);

  const { refetch } = query;

  useEffect(() => {
    if (!authReady) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetch();
      }
    });
    return () => subscription.remove();
  }, [authReady, refetch]);

  return query;
}
