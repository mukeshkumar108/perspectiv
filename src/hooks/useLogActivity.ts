import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import type { ActivityLogRequest } from '../api/schemas';

/**
 * Hook for logging activity engagement to the backend.
 * Call this whenever a user completes, partially completes, exits,
 * or declines an activity — whether self-initiated or LLM-suggested.
 *
 * source: 'SELF_INITIATED' when user opens from games/lessons/guides tabs
 * source: 'LLM_SUGGESTED' when user accepts from a voice session suggestion
 */
export function useLogActivity() {
  return useMutation<{ saved: boolean; id: string }, ApiError, ActivityLogRequest>({
    mutationFn: (data) => api.logActivity(data),
  });
}
