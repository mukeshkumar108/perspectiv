import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api, type ApiError } from '../api';
import type { VoiceLibraryResponse, VoiceRateRequest, VoiceResearchResponse } from '../api/schemas';
import { queryKeys } from '../state';
import { useCachedQuery } from '../storage';

export function useVoiceLibrary() {
  const authReady = useAuthReady();
  return useCachedQuery<VoiceLibraryResponse>('voiceLibrary', {
    queryKey: queryKeys.voiceLibrary,
    queryFn: () => api.getVoiceLibrary(),
    enabled: authReady,
    refetchOnMount: 'always',
  });
}

export function useVoiceResearch() {
  const authReady = useAuthReady();
  return useQuery<VoiceResearchResponse>({
    queryKey: queryKeys.voiceResearch,
    queryFn: () => api.getVoiceResearch(),
    enabled: authReady,
    refetchOnMount: 'always',
  });
}

export function useRateVoiceMemory() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, ApiError, VoiceRateRequest>({
    mutationFn: (data) => api.rateVoiceMemory(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.voiceResearch }),
  });
}
