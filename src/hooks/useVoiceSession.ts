import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  type VoiceEndRequest,
  type VoiceEndResponse,
  type VoiceStartRequest,
  type VoiceStartResponse,
  type VoiceTurnRequest,
  type VoiceTurnResponse,
} from '../api';
import { queryKeys } from '../state';

export function useStartVoiceSession() {
  return useMutation<VoiceStartResponse, ApiError, VoiceStartRequest>({
    mutationFn: (data) => api.startVoiceSession(data),
  });
}

export function useSubmitVoiceTurn() {
  return useMutation<VoiceTurnResponse, ApiError, VoiceTurnRequest>({
    mutationFn: (data) => api.submitVoiceTurn(data),
  });
}

export function useEndVoiceSession() {
  const queryClient = useQueryClient();

  return useMutation<VoiceEndResponse, ApiError, VoiceEndRequest>({
    mutationFn: (data) => api.endVoiceSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
    },
  });
}
