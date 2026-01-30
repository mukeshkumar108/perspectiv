import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from '../api';

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const apiError = error as ApiError | undefined;
  const status = apiError?.status;
  const code = apiError?.code;
  if (code === "HTML_RESPONSE" || code === "ROUTING_BACKOFF") {
    return false;
  }
  return status !== 401 && failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  today: ['today'] as const,
  streaks: ['streaks'] as const,
  me: ['me'] as const,
  moments: ['moments'] as const,
};
