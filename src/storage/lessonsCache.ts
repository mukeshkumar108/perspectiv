import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LessonItem, LessonsResponse } from '../api/schemas';

const STORAGE_KEY_PREFIX = 'perspectiv.lessonsCache';

export type LessonsCache = {
  items: LessonItem[];
  updatedAt: number;
};

function getStorageKey(userId?: string | null) {
  const normalizedUserId = (userId || 'anonymous').trim();
  return `${STORAGE_KEY_PREFIX}.${normalizedUserId || 'anonymous'}`;
}

function parseLessonsCache(raw: string): LessonsCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LessonsCache>;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items as LessonItem[],
      updatedAt:
        typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getLessonsCache(
  userId?: string | null
): Promise<LessonsCache | null> {
  const raw = await AsyncStorage.getItem(getStorageKey(userId));
  if (!raw) return null;
  return parseLessonsCache(raw);
}

export async function updateLessonsCacheFromApi(
  data: LessonsResponse,
  userId?: string | null
): Promise<LessonsCache | null> {
  const nextItems = Array.isArray(data.items) ? data.items : [];
  const existing = await getLessonsCache(userId);

  // Keep last known non-empty lessons when backend intermittently returns empty.
  if (nextItems.length === 0 && (existing?.items.length ?? 0) > 0) {
    return existing;
  }

  const nextCache: LessonsCache = {
    items: nextItems,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(nextCache)
  );
  return nextCache;
}
