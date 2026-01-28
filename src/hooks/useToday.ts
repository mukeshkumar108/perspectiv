import { useQuery } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import { queryKeys } from '../state';

export function useToday() {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => api.getToday(),
    enabled: authReady,
  });
}
