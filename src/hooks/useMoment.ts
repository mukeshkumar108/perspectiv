import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type MomentRequest, type MomentResponse, ApiError } from '../api';
import { queryKeys } from '../state';
import { useAuthReady } from '../auth';
import { addLocalMoment, enqueueOutbox, flushOutbox } from '../storage';

export function useCaptureMoment() {
  const queryClient = useQueryClient();
  const authReady = useAuthReady();

  return useMutation<MomentResponse, ApiError, MomentRequest>({
    mutationFn: async (data) => {
      const text = data.text?.trim();
      if (!text) {
        throw new ApiError(400, 'Moment text required');
      }

      const localMoment = await addLocalMoment(text);

      await enqueueOutbox({
        type: 'moment',
        payload: {
          text,
          dateLocal: undefined,
          localId: localMoment.localId,
        },
      });

      if (authReady) {
        flushOutbox();
      }

      return { saved: true, id: localMoment.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.moments });
    },
  });
}
