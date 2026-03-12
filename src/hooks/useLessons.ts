import { useQuery } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import type { LessonsResponse } from '../api';
import { queryKeys } from '../state';

export function useLessons() {
  const authReady = useAuthReady();

  return useQuery<LessonsResponse>({
    queryKey: queryKeys.lessons,
    queryFn: () => api.getLessons(),
    enabled: authReady,
    staleTime: 15 * 60 * 1000,
  });
}
