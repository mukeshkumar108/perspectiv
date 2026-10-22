import { useEffect, useMemo, useState } from 'react';
import { useProfile } from './useProfile';
import { useVoiceLibrary } from './useVoiceReports';
import { useStreaks } from './useStreaks';
import { dailySeed, greetingFor } from '../voice/greeting';
import { planSession } from '../voice/sessionPlan';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Everything Today and Talk need: what session is next, how to greet this person, and what time of day it is for them. */
export function useDayPlan() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const profile = useProfile();
  const library = useVoiceLibrary();
  const streaks = useStreaks();
  const timezone = useMemo(deviceTimezone, []);

  const recent = library.data?.recent ?? [];
  const loadedLibrary = library.data !== undefined;
  const hasEverTalked = (library.data?.items.length ?? 0) > 0 || recent.length > 0;

  return useMemo(() => {
    const plan = planSession({ now, timezone, recent, hasEverTalked });
    const last = recent[0] ? new Date(recent[0].createdAt).getTime() : null;
    const daysAway = last === null ? null : Math.floor((now.getTime() - last) / 86_400_000);
    const dayKey = now.toISOString().slice(0, 10);
    const greeting = greetingFor({
      name: profile.data?.profile.displayName,
      daypart: plan.daypart,
      streak: streaks.data?.currentStreak ?? 0,
      daysAway,
      seed: dailySeed(dayKey) + (plan.daypart === 'morning' ? 0 : plan.daypart === 'day' ? 1 : 2),
    });
    return {
      plan,
      greeting,
      name: profile.data?.profile.displayName ?? null,
      streak: streaks.data?.currentStreak ?? 0,
      recent,
      /** False until the first answer about their history has arrived, so we never show the Welcome to someone who has simply not loaded yet. */
      ready: loadedLibrary && profile.data !== undefined,
      hasEverTalked,
    };
  }, [now, timezone, recent, hasEverTalked, profile.data, streaks.data, loadedLibrary]);
}
