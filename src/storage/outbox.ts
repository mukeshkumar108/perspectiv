import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { api } from '../api';
import { markMomentSynced } from './momentCache';

const STORAGE_KEY = 'perspectiv.outbox';
const BASE_DELAY_MS = 1500;
const MAX_DELAY_MS = 60_000;

type OutboxItem =
  | {
      id: string;
      type: 'mood';
      payload: {
        dateLocal?: string;
        rating: number;
        tags?: string[];
        note?: string;
      };
      attempts: number;
      nextAttemptAt: number;
      createdAt: number;
    }
  | {
      id: string;
      type: 'moment';
      payload: {
        text?: string;
        imageUrl?: string;
        dateLocal?: string;
        localId?: string;
      };
      attempts: number;
      nextAttemptAt: number;
      createdAt: number;
    };

let flushing = false;

function generateId(): string {
  return `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
}

async function readQueue(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function enqueueOutbox(
  item: Omit<OutboxItem, 'id' | 'attempts' | 'nextAttemptAt' | 'createdAt'>
): Promise<OutboxItem> {
  const queue = await readQueue();
  const entry: OutboxItem = {
    ...item,
    id: generateId(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: Date.now(),
  } as OutboxItem;
  const next = [...queue, entry];
  await writeQueue(next);
  return entry;
}

async function processItem(item: OutboxItem): Promise<boolean> {
  try {
    if (item.type === 'mood') {
      await api.submitMood(item.payload);
      return true;
    }
    if (item.type === 'moment') {
      const result = await api.captureMoment({
        text: item.payload.text,
        imageUrl: item.payload.imageUrl,
      });
      await markMomentSynced(item.payload.localId, result.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const now = Date.now();
    const nextQueue: OutboxItem[] = [];

    for (const item of queue) {
      if (item.nextAttemptAt > now) {
        nextQueue.push(item);
        continue;
      }

      const success = await processItem(item);
      if (!success) {
        const attempts = item.attempts + 1;
        nextQueue.push({
          ...item,
          attempts,
          nextAttemptAt: Date.now() + nextDelay(attempts),
        });
      }
    }

    await writeQueue(nextQueue);
  } finally {
    flushing = false;
  }
}

export function useOutboxSync(authReady: boolean) {
  useEffect(() => {
    if (!authReady) return;
    flushOutbox();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushOutbox();
      }
    });
    return () => subscription.remove();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushOutbox();
      }
    });
    return () => unsubscribe();
  }, [authReady]);
}
