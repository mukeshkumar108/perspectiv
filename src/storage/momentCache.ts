import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { MomentItem } from '../api/schemas';

const STORAGE_KEY = 'perspectiv.momentCache';

export type LocalMoment = MomentItem & {
  pendingSync?: boolean;
  localId?: string;
};

type Listener = (moments: LocalMoment[]) => void;

const listeners = new Set<Listener>();

function notify(moments: LocalMoment[]) {
  listeners.forEach((listener) => listener(moments));
}

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readCache(): Promise<LocalMoment[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalMoment[];
  } catch {
    return [];
  }
}

async function writeCache(items: LocalMoment[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify(items);
}

export async function listMoments(): Promise<LocalMoment[]> {
  return readCache();
}

export async function addLocalMoment(text: string): Promise<LocalMoment> {
  const localId = generateLocalId();
  const item: LocalMoment = {
    id: localId,
    localId,
    text,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    pendingSync: true,
  };

  const existing = await readCache();
  const next = [item, ...existing].slice(0, 100);
  await writeCache(next);
  return item;
}

export async function markMomentSynced(
  localId: string | undefined,
  serverId: string
): Promise<void> {
  if (!localId) return;
  const existing = await readCache();
  const next = existing.map((item) => {
    if (item.localId !== localId && item.id !== localId) return item;
    return {
      ...item,
      id: serverId,
      pendingSync: false,
    };
  });
  await writeCache(next);
}

export async function mergeServerMoments(
  serverItems: MomentItem[]
): Promise<void> {
  const existing = await readCache();
  const seenTextDates = new Set<string>();
  const seenIds = new Set<string>();
  const merged: LocalMoment[] = [];

  for (const item of serverItems) {
    const key = `${item.text ?? ''}::${item.createdAt}`;
    if (seenTextDates.has(key)) continue;
    seenTextDates.add(key);
    if (item.id) seenIds.add(item.id);
    merged.push({ ...item, pendingSync: false });
  }

  for (const item of existing) {
    const key = `${item.text ?? ''}::${item.createdAt}`;
    if (item.id && seenIds.has(item.id)) continue;
    if (seenTextDates.has(key)) continue;
    seenTextDates.add(key);
    merged.push(item);
  }

  await writeCache(merged.slice(0, 100));
}

export function subscribeMoments(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMomentCache(limit = 20) {
  const [moments, setMoments] = useState<LocalMoment[]>([]);

  useEffect(() => {
    let mounted = true;
    listMoments().then((items) => {
      if (!mounted) return;
      setMoments(items.slice(0, limit));
    });
    const unsubscribe = subscribeMoments((items) => {
      setMoments(items.slice(0, limit));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit]);

  return moments;
}
