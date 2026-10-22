export type Daypart = 'morning' | 'day' | 'evening';
export type PlannedFlow = 'onboarding' | 'morning' | 'daytime' | 'evening';

export interface RecentSession {
  flow: string | null;
  createdAt: string;
}

export interface SessionPlan {
  flow: PlannedFlow;
  daypart: Daypart;
  /** What the main button says. */
  title: string;
  /** One line under it. */
  subtitle: string;
  /** When the evening reflection opens, if it is not open yet. */
  eveningOpensAtHour: number | null;
}

export const EVENING_HOUR = 18;
export const MORNING_ENDS_HOUR = 12;

const EVENING_FLOWS = new Set(['evening', 'first_reflection_core']);
const MORNING_FLOWS = new Set(['morning']);

function localParts(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
  } catch {
    return { day: date.toISOString().slice(0, 10), hour: date.getUTCHours() };
  }
}

export function daypartAt(hour: number): Daypart {
  if (hour < MORNING_ENDS_HOUR) return 'morning';
  if (hour < EVENING_HOUR) return 'day';
  return 'evening';
}

/**
 * What "Talk to Bluum" starts right now, in the person's own timezone:
 * the very first time, the welcome; the first session of a morning, the morning check-in; from 6 pm, the evening reflection;
 * otherwise a drop-in. Once a session of a kind is done today the next one is a drop-in.
 */
export function planSession(input: { now: Date; timezone: string; recent: RecentSession[]; hasEverTalked: boolean }): SessionPlan {
  const { now, timezone, recent, hasEverTalked } = input;
  const here = localParts(now, timezone);
  const daypart = daypartAt(here.hour);
  const today = recent.filter((s) => localParts(new Date(s.createdAt), timezone).day === here.day);
  const morningDone = today.some((s) => s.flow && MORNING_FLOWS.has(s.flow));
  const eveningDone = today.some((s) => s.flow && EVENING_FLOWS.has(s.flow));
  const eveningOpensAtHour = here.hour < EVENING_HOUR && !eveningDone ? EVENING_HOUR : null;

  if (!hasEverTalked) {
    return { flow: 'onboarding', daypart, title: 'Meet Bluum', subtitle: 'A first conversation. Two minutes.', eveningOpensAtHour };
  }
  if (daypart === 'evening' && !eveningDone) {
    return { flow: 'evening', daypart, title: 'Evening reflection', subtitle: 'One good moment from today.', eveningOpensAtHour: null };
  }
  if (daypart === 'morning' && !morningDone) {
    return { flow: 'morning', daypart, title: 'Morning check-in', subtitle: 'What are you looking forward to?', eveningOpensAtHour };
  }
  return { flow: 'daytime', daypart, title: 'Talk to Bluum', subtitle: 'Something on your mind, or something to catch?', eveningOpensAtHour };
}
