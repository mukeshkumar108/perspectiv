import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'perspectiv.games.stroopBloom.history';
const MAX_SESSIONS = 60;

export type StroopBloomSession = {
  id: string;
  playedAt: string;
  durationSec: 30 | 60;
  score: number;
  trials: number;
  accuracy: number;
  incongruentAccuracy: number;
  reactionMedian: number;
  stroopCost: number;
  bestStreak: number;
};

type Listener = (sessions: StroopBloomSession[]) => void;
const listeners = new Set<Listener>();

function notify(sessions: StroopBloomSession[]) {
  listeners.forEach((listener) => listener(sessions));
}

async function readHistory(): Promise<StroopBloomSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StroopBloomSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(sessions: StroopBloomSession[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  notify(sessions);
}

export async function listStroopBloomHistory() {
  return readHistory();
}

export async function addStroopBloomSession(
  session: Omit<StroopBloomSession, 'id' | 'playedAt'>
) {
  const existing = await readHistory();
  const next: StroopBloomSession[] = [
    {
      ...session,
      id: `stroop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_SESSIONS);
  await writeHistory(next);
  return next[0];
}

export function subscribeStroopBloomHistory(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStroopBloomHistory(limit = 6) {
  const [sessions, setSessions] = useState<StroopBloomSession[]>([]);

  useEffect(() => {
    let mounted = true;
    listStroopBloomHistory().then((items) => {
      if (!mounted) return;
      setSessions(items.slice(0, limit));
    });
    const unsubscribe = subscribeStroopBloomHistory((items) => {
      setSessions(items.slice(0, limit));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit]);

  return sessions;
}
