import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useProfile } from './useProfile';

const KEY = 'perspectiv.onboarding.done';

export async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // If it cannot be saved, the worst case is seeing the welcome once more.
  }
}

/** True when this person should be taken through the first-run flow: no name yet and they have not been through it. */
export function useNeedsOnboarding(): boolean {
  const profile = useProfile();
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setDone(v === '1'))
      .catch(() => setDone(false));
  }, []);
  if (done === null || profile.data === undefined) return false;
  return !done && !(profile.data.profile.displayName ?? '').trim();
}
