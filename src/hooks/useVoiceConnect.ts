import { useMutation } from '@tanstack/react-query';
import {
  api,
  ApiError,
  type VoiceConnectRequest,
  type VoiceConnectResponse,
} from '../api';

export function useVoiceConnect() {
  return useMutation<VoiceConnectResponse, ApiError, VoiceConnectRequest>({
    mutationFn: (data) => api.connectVoice(data),
  });
}
