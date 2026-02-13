import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api } from '../api';
import type { MomentsListResponse } from '../api/schemas';
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

  const query = useQuery<MomentsListResponse>({
    queryKey: [...queryKeys.moments, { limit }],
    queryFn: () => api.getMoments({ limit }),
    enabled: authReady,
  });

  useEffect(() => {
    if (!query.data?.items) return;
    void mergeServerMoments(query.data.items);
  }, [query.data]);

  return query;
}
