import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { api } from '@/src/api';
import { queryClient, queryKeys } from '@/src/state/queryClient';

/**
 * Sample-data mode for taking design screenshots without a login.
 * Only on when EXPO_PUBLIC_SCREENSHOT_MODE=1 is set for a local dev server; it is not in .env or any published update.
 * It skips the sign-in redirect and fills the query cache and the phone's own storage with a made-up person, so every screen has something to show.
 */
export const SCREENSHOT_MODE = process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1';

const DAY = 86_400_000;
const ago = (days: number, hour = 9, minute = 0) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const cards = [
  { id: 'c1', createdAt: ago(0, 8, 12), flow: 'morning', card: { kind: 'intention', headline: 'The walk with Dad', moment: "I'm looking forward to the walk with Dad this evening.", theme: 'family', tags: ['dad', 'walk'] } },
  { id: 'c2', createdAt: ago(1, 19, 40), flow: 'evening', card: { kind: 'moment', headline: 'Coffee on the step', moment: 'I had my coffee on the back step before anyone was up, and the whole street was quiet.', theme: 'quiet time', tags: ['morning', 'coffee'] } },
  { id: 'c3', createdAt: ago(2, 20, 5), flow: 'evening', card: { kind: 'moment', headline: 'Maya laughed at my joke', moment: 'My sister laughed properly at something I said on the phone, the kind of laugh you can hear her face in.', theme: 'family', tags: ['sister', 'laugh'] } },
  { id: 'c4', createdAt: ago(3, 18, 30), flow: 'daytime', card: { kind: 'moment', headline: 'The bakery smell', moment: 'Walking past the bakery and it smelled like warm bread. I stopped for a second just to stand in it.', theme: 'small pleasures', tags: ['bakery'] } },
  { id: 'c5', createdAt: ago(4, 19, 15), flow: 'ten_things', card: { kind: 'self', headline: 'What I like about me', moment: 'I like that I keep my word. I like that I notice when someone is quiet. I like that I laugh at myself.', theme: 'self', tags: ['self'] } },
  { id: 'c6', createdAt: ago(5, 20, 10), flow: 'evening', card: { kind: 'moment', headline: 'Finished the report', moment: 'I finally sent the report I had been avoiding all week, and it felt lighter than I expected.', theme: 'work', tags: ['work'] } },
  { id: 'c7', createdAt: ago(6, 19, 50), flow: 'evening', card: { kind: 'moment', headline: 'Rain on the window', moment: 'I sat and listened to the rain on the window while the soup was on.', theme: 'quiet time', tags: ['rain'] } },
  { id: 'c8', createdAt: ago(8, 20, 20), flow: 'evening', card: { kind: 'moment', headline: 'Sunday with the dog', moment: 'A long slow walk with the dog, no phone, and he found every puddle.', theme: 'outdoors', tags: ['dog', 'walk'] } },
];

const lessons = [
  { id: 'l1', title: 'How attention shapes mood', description: 'Why what you notice changes how the day feels.', audioUrl: 'https://example.com/l1.mp3', order: 1, tags: ['attention'], durationSec: 240 },
  { id: 'l2', title: 'The small good things', description: 'A short guide to catching moments you would normally rush past.', audioUrl: 'https://example.com/l2.mp3', order: 2, tags: ['gratitude'], durationSec: 195 },
  { id: 'l3', title: 'Slowing down on purpose', description: 'Three minutes on pace, breath and listening.', audioUrl: 'https://example.com/l3.mp3', order: 3, tags: ['calm'], durationSec: 180 },
];

const voiceFeatures = (i: number) => ({
  utterances: 6,
  clean_utterances: 4,
  speech_seconds: 74 + i * 3,
  f0_mean_hz: 182 + (i % 3) * 2,
  f0_sd_st: 2.9 - (i === 0 ? 0.5 : 0) + (i % 2) * 0.1,
  articulation_rate_syl_s: 4.1 - (i === 0 ? 0.35 : 0) + (i % 3) * 0.05,
  pause_ratio: 0.31 + (i === 0 ? 0.06 : 0) + (i % 2) * 0.01,
  loudness_sd_db: 5.2 + (i % 3) * 0.2,
  jitter_local: 0.021 + (i % 2) * 0.002,
  shimmer_local: 0.1 + (i % 3) * 0.004,
  hnr_db: 10.4 - (i % 2) * 0.3,
});

const reports = cards.slice(0, 7).map((c, i) => ({
  id: `r${i + 1}`,
  createdAt: c.createdAt,
  flow: c.flow,
  durationSeconds: 150 + i * 12,
  card: c.card,
  profile: {
    specificity: 'specific', people_focus: i % 2 ? 'central' : 'mentioned', feelings: 'named', why: 'stated', sensory: 'some',
    novelty: 'mixed', expression: 'moderate', meaning_signal: 'high', entry_mood: 'tired', exit_mood: 'lighter',
    reading: 'Stayed on one moment and said why it mattered.',
  },
  voiceFeatures: voiceFeatures(i),
  memoryUpdates: i === 0 ? [
    { id: 'm1', kind: 'person', action: 'added', basis: 'Dad, someone they walk with and enjoy time with', correct: null },
    { id: 'm2', kind: 'thread', action: 'added', basis: 'Walk with Dad this evening', correct: true },
  ] : [],
  costUsd: 0.006,
  models: { card: 'deepseek/deepseek-v4-flash' },
  promptVersion: 'report-v4',
  ruleVersion: 'rules-v0.1',
}));

const researchSample = {
  reports,
  memory: {
    people: [
      { id: 'p1', name: 'Dad', relation: 'father', meaning: 'Someone they walk with and enjoy time with', basis: 'Mentioned walking with Dad twice', correct: true, sensitivity: 'nominal' },
      { id: 'p2', name: 'Maya', relation: 'sister', meaning: 'Close; they talk often', basis: 'Laughed on the phone with Maya', correct: null, sensitivity: 'nominal' },
    ],
    themes: [
      { id: 't1', label: 'quiet time outdoors', basis: 'Rain, the back step, the dog walk', correct: true, sensitivity: 'nominal' },
      { id: 't2', label: 'small pleasures', basis: 'The bakery smell', correct: null, sensitivity: 'nominal' },
    ],
    facts: [
      { id: 'f1', fact: 'Walks most evenings', category: 'habit', basis: 'Said "most evenings"', correct: null, sensitivity: 'nominal' },
      { id: 'f2', fact: 'Likes that they keep their word', category: 'self_regard', basis: 'Named in ten things', correct: true, sensitivity: 'nominal' },
    ],
    openThreads: [
      { id: 'th1', topic: 'Walk with Dad this evening', status: 'open', suggestedCheckin: 'How was the walk with Dad?', basis: 'Said in the morning', correct: null, sensitivity: 'nominal' },
    ],
    style: { notes: ['Short, warm answers; picks one thing and stays on it'] },
  },
};

const flashHistory = [243, 251, 262, 238, 270, 255, 249].map((median, i) => ({
  id: `flash_${i}`, playedAt: ago(i, 8, 30), score: 1000 - median, reactionMedian: median, fastest: median - 31, average: median + 9, falseStarts: i % 3 === 0 ? 1 : 0,
}));
const impulseHistory = [0, 1, 2, 3, 4].map((i) => ({
  id: `ip_${i}`, playedAt: ago(i, 12, 10), durationSec: 30 as const, score: 1280 - i * 40, bestStreak: 14 - i, accuracy: 0.93 - i * 0.01, reactionMedian: 412 + i * 6,
}));
const stroopHistory = [0, 1, 2, 3].map((i) => ({
  id: `st_${i}`, playedAt: ago(i, 17, 40), durationSec: 30 as const, score: 940 - i * 30, trials: 38 - i, accuracy: 0.92 - i * 0.01, incongruentAccuracy: 0.86 - i * 0.01,
  reactionMedian: 640 + i * 10, stroopCost: 118 + i * 6, bestStreak: 11 - i,
}));
const memoryHistory = [0, 1, 2, 3].map((i) => ({
  id: `mm_${i}`, playedAt: ago(i, 21, 5), durationSec: 60 as const, score: 1500 - i * 70, matches: 8 - (i > 2 ? 1 : 0), moves: 16 + i * 2,
}));
const assessments = [
  { id: 'a1', type: 'gad7', score: 4, maxScore: 21, answers: [1, 0, 1, 1, 0, 1, 0], createdAt: ago(3, 20, 0) },
  { id: 'a2', type: 'phq9', score: 5, maxScore: 27, answers: [1, 1, 1, 1, 0, 1, 0, 0, 0], createdAt: ago(18, 20, 0) },
  { id: 'a3', type: 'cantril', score: 7, maxScore: 10, answers: [7], createdAt: ago(20, 20, 0) },
];

const storageSeed: Record<string, unknown> = {
  'perspectiv.onboarding.done': '1',
  'perspectiv.games.flash.history': flashHistory,
  'perspectiv.games.impulsePop.history': impulseHistory,
  'perspectiv.games.stroopBloom.history': stroopHistory,
  'perspectiv.games.memoryMatch.history': memoryHistory,
  'perspectiv.assessments.history': assessments,
};

function seedQueries() {
  queryClient.setQueryData(queryKeys.profile, { profile: { displayName: 'Sam', email: 'sam@example.com', pronouns: 'they/them', gender: null, birthYear: 1994 } });
  queryClient.setQueryData(queryKeys.me, { id: 'sample', email: 'sam@example.com', firstName: 'Sam', lastName: null, imageUrl: null });
  queryClient.setQueryData(queryKeys.streaks, { currentStreak: 6, longestStreak: 11, totalReflections: 23, lastReflectionDate: ago(0).slice(0, 10) });
  queryClient.setQueryData(queryKeys.today, { prompt: { id: 'p', text: 'What is one small thing that felt good today?' }, hasReflected: false, hasReflectedToday: false, onboardingCompleted: true, hasMood: false, didSwapPrompt: false, dateLocal: ago(0).slice(0, 10) });
  queryClient.setQueryData(queryKeys.voiceLibrary, { items: cards, recent: cards.map((c) => ({ flow: c.flow, createdAt: c.createdAt })) });
  queryClient.setQueryData(queryKeys.lessons, { items: lessons });
  queryClient.setQueryData(queryKeys.voiceResearch, researchSample);
}

/** True once the sample data is in place (immediately, outside screenshot mode). */
export function useScreenshotSeed(): boolean {
  const [ready, setReady] = useState(!SCREENSHOT_MODE);
  useEffect(() => {
    if (!SCREENSHOT_MODE) return;
    seedQueries();
    // No server here: saving the profile just echoes it back, so the onboarding flow can move on.
    (api as { updateProfile: (d: Record<string, unknown>) => Promise<unknown> }).updateProfile = async (d) => ({ profile: { ...(queryClient.getQueryData(queryKeys.profile) as { profile: object }).profile, ...d } });
    Promise.all(Object.entries(storageSeed).map(([k, v]) => AsyncStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);
  return ready;
}
