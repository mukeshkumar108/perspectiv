import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReady } from '../auth';
import { api, type ApiError } from '../api';
import type { ProfileResponse, ProfileUpdate } from '../api/schemas';
import { queryKeys } from '../state';
import { useCachedQuery } from '../storage';

export function useProfile() {
  const authReady = useAuthReady();
  return useCachedQuery<ProfileResponse>('profile', {
    queryKey: queryKeys.profile,
    queryFn: () => api.getProfile(),
    enabled: authReady,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<ProfileResponse, ApiError, ProfileUpdate>({
    mutationFn: (data) => api.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
