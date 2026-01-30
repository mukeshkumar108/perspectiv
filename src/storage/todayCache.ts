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

  const next: TodayCache = {
    ...base,
    ...update,
    dateLocal,
    updatedAt: Date.now(),
  };

  await writeCache(next);
  return next;
}

export async function updateTodayCacheFromApi(
  data: TodayResponse
): Promise<TodayCache> {
  return updateTodayCache({
    dateLocal: data.dateLocal || getLocalDateKey(),
    hasMood: data.hasMood ?? false,
    hasReflected:
      data.hasReflected ?? data.hasReflectedToday ?? false,
    lastPromptText: data.prompt?.text,
  });
}
