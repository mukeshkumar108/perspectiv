import { useAuthReady } from '../auth';
import { api } from '../api';
import type { LessonsResponse } from '../api';
import { queryKeys } from '../state';
import { useCachedQuery } from '../storage';

export function useLessons() {
  const authReady = useAuthReady();

  return useCachedQuery<LessonsResponse>('lessons', {
    queryKey: queryKeys.lessons,
    queryFn: () => api.getLessons(),
    enabled: authReady,
    staleTime: 15 * 60 * 1000,
  });
}
