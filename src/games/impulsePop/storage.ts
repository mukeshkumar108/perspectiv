import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'perspectiv.games.impulsePop.history';
const MAX_SESSIONS = 60;

export type ImpulsePopSession = {
  id: string;
  playedAt: string;
  durationSec: 30 | 60;
  score: number;
  bestStreak: number;
  accuracy: number;
  reactionMedian: number;
};

type Listener = (sessions: ImpulsePopSession[]) => void;
const listeners = new Set<Listener>();

function notify(sessions: ImpulsePopSession[]) {
  listeners.forEach((listener) => listener(sessions));
}

async function readHistory(): Promise<ImpulsePopSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ImpulsePopSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function writeHistory(sessions: ImpulsePopSession[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  notify(sessions);
}

export async function listImpulsePopHistory() {
  return readHistory();
}

export async function addImpulsePopSession(
  session: Omit<ImpulsePopSession, 'id' | 'playedAt'>
) {
  const existing = await readHistory();
  const next: ImpulsePopSession[] = [
    {
      ...session,
      id: `impulse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_SESSIONS);
  await writeHistory(next);
  return next[0];
}

export function subscribeImpulsePopHistory(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useImpulsePopHistory(limit = 6) {
  const [sessions, setSessions] = useState<ImpulsePopSession[]>([]);

  useEffect(() => {
    let mounted = true;
    listImpulsePopHistory().then((items) => {
      if (!mounted) return;
      setSessions(items.slice(0, limit));
    });
    const unsubscribe = subscribeImpulsePopHistory((items) => {
      setSessions(items.slice(0, limit));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit]);

  return sessions;
}
