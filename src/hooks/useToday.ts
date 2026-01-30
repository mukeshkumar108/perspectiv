import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
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

  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => api.getToday(),
    enabled: authReady,
    onSuccess: (data) => {
      updateTodayCacheFromApi(data);
    },
  });
}
