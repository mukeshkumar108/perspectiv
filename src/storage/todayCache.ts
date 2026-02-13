import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TodayResponse } from '../api/schemas';

const STORAGE_KEY = 'perspectiv.todayCache';

export type TodayCache = {
  dateLocal: string;
  hasMood?: boolean;
  moodRating?: number | null;
  hasReflected?: boolean;
  lastPromptText?: string;
  updatedAt: number;
};

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readCache(): Promise<TodayCache | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TodayCache;
  } catch {
    return null;
  }
}

async function writeCache(cache: TodayCache): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export async function getTodayCache(): Promise<TodayCache | null> {
  return readCache();
}

export async function updateTodayCache(
  update: Partial<TodayCache> & { dateLocal?: string }
): Promise<TodayCache> {
  const dateLocal = update.dateLocal || getLocalDateKey();
  const existing = await readCache();
  const base: TodayCache =
    existing && existing.dateLocal === dateLocal
      ? existing
      : { dateLocal, updatedAt: Date.now() };

  const cleanedUpdate = Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  ) as Partial<TodayCache> & { dateLocal?: string };

  const next: TodayCache = {
    ...base,
    ...cleanedUpdate,
    dateLocal,
    updatedAt: Date.now(),
  };

  await writeCache(next);
  return next;
}

export async function updateTodayCacheFromApi(
  data: TodayResponse
): Promise<TodayCache> {
  const localDate = getLocalDateKey();
  const dateLocal = data.dateLocal || localDate;
  const existing = await readCache();
  const shouldPreserveLocalMood =
    existing?.dateLocal === localDate && existing?.moodRating != null;
  const targetDate = shouldPreserveLocalMood ? localDate : dateLocal;
  const sameDay = existing?.dateLocal === targetDate;

  return updateTodayCache({
    dateLocal: targetDate,
    hasMood:
      shouldPreserveLocalMood
        ? true
        : sameDay && existing?.hasMood === true
          ? true
          : data.hasMood ?? false,
    moodRating:
      shouldPreserveLocalMood
        ? existing?.moodRating ?? undefined
        : sameDay && existing?.moodRating != null
          ? existing.moodRating
          : undefined,
    hasReflected:
      sameDay && existing?.hasReflected === true
        ? true
        : data.hasReflected ?? data.hasReflectedToday ?? false,
    lastPromptText: data.prompt?.text || existing?.lastPromptText,
  });
}
