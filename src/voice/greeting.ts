import type { Daypart } from './sessionPlan';

export interface GreetingInput {
  name?: string | null;
  daypart: Daypart;
  /** Days in a row, today included once something is kept. */
  streak: number;
  /** Whole days since they last talked, or null if never. */
  daysAway: number | null;
  /** A stable number for the day, so the line does not change every render. */
  seed: number;
}

export interface Greeting {
  headline: string;
  sub: string;
}

// Short, dry, warm. No exclamation marks, no therapy language, no pet names.
const HEADLINES: Record<Daypart, string[]> = {
  morning: ['Morning, {name}.', 'Good morning, {name}.', 'Morning, {name}. New day.', 'There you are, {name}.'],
  day: ['Hello, {name}.', 'Afternoon, {name}.', 'Hi, {name}. Good timing.', 'Back again, {name}.'],
  evening: ['Evening, {name}.', 'Good evening, {name}.', 'Evening, {name}. You made it.', 'Hello, {name}. How was it?'],
};
const NAMELESS: Record<Daypart, string[]> = {
  morning: ['Good morning.', 'Morning. New day.'],
  day: ['Hello.', 'Good timing.'],
  evening: ['Good evening.', 'You made it.'],
};

const SUBS: Record<Daypart, string[]> = {
  morning: ['One thing to look forward to is plenty.', 'Start small. Start here.', 'The day is still unwritten.'],
  day: ['Catch something before it slips away.', 'Two minutes, if you have them.', 'The good bits are easy to miss.'],
  evening: ['What was the best bit?', 'Let us find the good in it.', 'Today had something in it. Let us find it.'],
};

const pick = <T,>(items: T[], seed: number) => items[Math.abs(seed) % items.length];

export function greetingFor(input: GreetingInput): Greeting {
  const { name, daypart, streak, daysAway, seed } = input;
  const trimmed = name?.trim();
  const headline = trimmed ? pick(HEADLINES[daypart], seed).replace('{name}', trimmed) : pick(NAMELESS[daypart], seed);

  if (daysAway !== null && daysAway >= 3) {
    return { headline: trimmed ? `Welcome back, ${trimmed}.` : 'Welcome back.', sub: 'It is good to see you again. No catching up needed.' };
  }
  if (streak >= 7) return { headline, sub: `${streak} days in a row. Quietly impressive.` };
  if (streak >= 3) return { headline, sub: `${streak} days in a row. It is becoming a habit.` };
  return { headline, sub: pick(SUBS[daypart], seed + 1) };
}

/** A number that is the same all day, from a local date key like 2026-10-22. */
export function dailySeed(dayKey: string): number {
  let h = 0;
  for (let i = 0; i < dayKey.length; i += 1) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return h;
}
