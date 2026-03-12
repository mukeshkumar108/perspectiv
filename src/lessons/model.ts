import type { LessonItem } from '@/src/api';

function normalizeOrder(value: number | undefined) {
  return Number.isFinite(value) ? (value as number) : Number.MAX_SAFE_INTEGER;
}

export function sortLessons(items: LessonItem[]): LessonItem[] {
  return [...items].sort((a, b) => {
    const byOrder = normalizeOrder(a.order) - normalizeOrder(b.order);
    if (byOrder !== 0) return byOrder;
    return a.title.localeCompare(b.title);
  });
}

export function getLessonRouteId(_item: LessonItem, index: number): string {
  return String(index);
}

export function findLessonByRouteId(items: LessonItem[], routeId: string | undefined) {
  if (!routeId) return null;
  const index = Number.parseInt(routeId, 10);
  if (Number.isNaN(index) || index < 0 || index >= items.length) return null;
  return items[index] ?? null;
}
