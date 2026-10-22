import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'perspectiv.games.flash.history';
const MAX_SESSIONS = 60;

export type FlashSession = {
  id: string;
  playedAt: string;
  score: number;
  /** Median reaction in milliseconds across the rounds. */
  reactionMedian: number;
  fastest: number;
  average: number;
  falseStarts: number;
};

type Listener = (sessions: FlashSession[]) => void;
const listeners = new Set<Listener>();

async function readHistory(): Promise<FlashSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FlashSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listFlashHistory() {
  return readHistory();
}

export async function addFlashSession(session: Omit<FlashSession, 'id' | 'playedAt'>) {
  const existing = await readHistory();
  const next: FlashSession[] = [
    { ...session, id: `flash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, playedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_SESSIONS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener(next));
  return next[0];
}

export function useFlashHistory(limit = 6) {
  const [sessions, setSessions] = useState<FlashSession[]>([]);
  useEffect(() => {
    let mounted = true;
    listFlashHistory().then((items) => mounted && setSessions(items.slice(0, limit)));
    const listener: Listener = (items) => setSessions(items.slice(0, limit));
    listeners.add(listener);
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, [limit]);
  return sessions;
}
