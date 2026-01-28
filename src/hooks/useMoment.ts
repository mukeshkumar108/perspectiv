import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MomentRequest, type MomentResponse, ApiError } from '../api';
import { queryKeys } from '../state';

export function useCaptureMoment() {
  const queryClient = useQueryClient();

  return useMutation<MomentResponse, ApiError, MomentRequest>({
    mutationFn: (data) => api.captureMoment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}
