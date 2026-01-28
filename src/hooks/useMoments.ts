import { useQuery } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import { queryKeys } from '../state';

export function useMoments(limit?: number) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: [...queryKeys.moments, { limit }],
    queryFn: () => api.getMoments({ limit }),
    enabled: authReady,
  });
}
