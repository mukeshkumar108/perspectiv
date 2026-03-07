export type GamePhase = 'idle' | 'countdown' | 'playing' | 'results';

export type BubbleColorKey = 'gold' | 'coral' | 'mint' | 'sky';

export interface BubbleEntity {
  id: string;
  x: number;
  y: number;
  size: number;
  color: BubbleColorKey;
  isTarget: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface BurstEntity {
  id: string;
  x: number;
  y: number;
  color: BubbleColorKey;
  createdAt: number;
}

export interface ScoreState {
  score: number;
  streak: number;
  bestStreak: number;
  correctTaps: number;
  wrongTaps: number;
  missedTargets: number;
  totalTaps: number;
  reactionSamplesMs: number[];
}

export const COLOR_MAP: Record<BubbleColorKey, string> = {
  gold: '#FFDC61',
  coral: '#FF7DAF',
  mint: '#77D7A7',
  sky: '#7EC8FF',
};

export const TARGET_LABEL: Record<BubbleColorKey, string> = {
  gold: 'Gold (Yellow)',
  coral: 'Coral (Pink)',
  mint: 'Mint (Green)',
  sky: 'Sky (Blue)',
};

export const GAME_DURATIONS = [30, 60] as const;

export const SCORE_RULES = {
  hit: 10,
  wrong: -6,
  missTarget: -2,
} as const;

export const BUBBLE_RULES = {
  sizeMin: 36,
  sizeMax: 74,
  lifeMinMs: 1200,
  lifeMaxMs: 2200,
  maxOnScreen: 10,
  spawnStartMs: 550,
  spawnEndMs: 280,
  targetChance: 0.42,
  burstLifetimeMs: 380,
} as const;

export const COUNTDOWN_SECONDS = 3;

export function clampScore(value: number) {
  return Math.max(0, Math.round(value));
}

export function streakMultiplier(streak: number) {
  if (streak >= 10) return 1.5;
  if (streak >= 5) return 1.25;
  return 1;
}

export function median(samples: number[]) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

export function accuracyPercent(correct: number, taps: number) {
  if (taps <= 0) return 0;
  return Math.round((correct / taps) * 100);
}

export function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}
