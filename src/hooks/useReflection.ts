import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ReflectionRequest, type ReflectionResponse, ApiError } from '../api';
import { queryKeys } from '../state';

export function useSubmitReflection() {
  const queryClient = useQueryClient();

  return useMutation<ReflectionResponse, ApiError, ReflectionRequest>({
    mutationFn: (data) => api.submitReflection(data),
    onSuccess: () => {
      // Invalidate and refetch related queries after successful submission
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
    },
  });
}
