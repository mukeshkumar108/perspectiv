import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type MoodRequest, type MoodResponse, ApiError } from '../api';
import { queryKeys } from '../state';
import { useAuthReady } from '../auth';
import { enqueueOutbox, flushOutbox, updateTodayCache, getLocalDateKey } from '../storage';

export function useSubmitMood() {
  const queryClient = useQueryClient();
  const authReady = useAuthReady();

  return useMutation<MoodResponse, ApiError, MoodRequest>({
    mutationFn: async (data) => {
      const dateLocal = data.dateLocal || getLocalDateKey();
      await updateTodayCache({
        dateLocal,
        hasMood: true,
        moodRating: data.rating,
      });
      queryClient.setQueryData(queryKeys.today, (prev: any) => ({
        ...(prev ?? {}),
        hasMood: true,
      }));

      await enqueueOutbox({
        type: 'mood',
        payload: {
          dateLocal,
          rating: data.rating,
          tags: data.tags,
          note: data.note,
        },
      });

      if (authReady) {
        flushOutbox();
      }

      return { saved: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}
