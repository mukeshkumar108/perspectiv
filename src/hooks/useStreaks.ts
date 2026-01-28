import { useQuery } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import { queryKeys } from '../state';

export function useStreaks() {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: queryKeys.streaks,
    queryFn: () => api.getStreaks(),
    enabled: authReady,
  });
}
