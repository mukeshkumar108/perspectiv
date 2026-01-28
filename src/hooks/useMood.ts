import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MoodRequest, type MoodResponse, ApiError } from '../api';
import { queryKeys } from '../state';

export function useSubmitMood() {
  const queryClient = useQueryClient();

  return useMutation<MoodResponse, ApiError, MoodRequest>({
    mutationFn: (data) => api.submitMood(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}
