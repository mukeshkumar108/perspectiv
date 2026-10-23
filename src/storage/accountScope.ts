import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { queryClient } from '@/src/state/queryClient';

const OWNER_KEY = 'perspectiv.account.owner';

/**
 * Everything kept on the phone (cached moments, lessons, today, onboarding, nudges, game history, outbox) belongs to whoever
 * was signed in. When a different person signs in on the same phone, wipe it first so nothing of the last person shows up.
 * `userId`: undefined while auth loads, null when signed out, otherwise the signed-in id. Returns true once it is safe to render.
 */
export function useAccountScope(userId: string | null | undefined) {
  const [checkedFor, setCheckedFor] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (userId === undefined) return;
    if (userId === null) {
      setCheckedFor(null);
      return;
    }
    let live = true;
    (async () => {
      try {
        const owner = await AsyncStorage.getItem(OWNER_KEY);
        if (owner !== userId) {
          const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('perspectiv.') && k !== OWNER_KEY);
          if (keys.length) await AsyncStorage.multiRemove(keys);
          queryClient.clear();
          await AsyncStorage.setItem(OWNER_KEY, userId);
        }
      } catch {
        // If storage misbehaves, show the app rather than a blank screen.
      }
      if (live) setCheckedFor(userId);
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  return userId === undefined ? false : checkedFor === userId;
}
