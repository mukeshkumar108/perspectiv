import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import { queryKeys } from '../state';
import { mergeServerMoments, listMoments } from '../storage';
import { useEffect } from 'react';

export function useMoments(limit?: number) {
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  useEffect(() => {
    listMoments().then((items) => {
      const data = { items: items.slice(0, limit ?? items.length) };
      queryClient.setQueryData(
        [...queryKeys.moments, { limit }],
        (prev: any) => prev ?? data
      );
    });
  }, [limit, queryClient]);

  return useQuery({
    queryKey: [...queryKeys.moments, { limit }],
    queryFn: () => api.getMoments({ limit }),
    enabled: authReady,
    onSuccess: (data) => {
      mergeServerMoments(data.items);
    },
  });
}
