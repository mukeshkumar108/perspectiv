import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'perspectiv.games.memoryMatch.history';
const MAX_SESSIONS = 60;

export type MemoryMatchSession = {
  id: string;
  playedAt: string;
  durationSec: 30 | 60;
  score: number;
  matches: number;
  moves: number;
};

type Listener = (sessions: MemoryMatchSession[]) => void;
const listeners = new Set<Listener>();

function notify(sessions: MemoryMatchSession[]) {
  listeners.forEach((listener) => listener(sessions));
}

async function readHistory(): Promise<MemoryMatchSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MemoryMatchSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(sessions: MemoryMatchSession[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  notify(sessions);
}

export async function listMemoryMatchHistory() {
  return readHistory();
}

export async function addMemoryMatchSession(
  session: Omit<MemoryMatchSession, 'id' | 'playedAt'>
) {
  const existing = await readHistory();
  const next: MemoryMatchSession[] = [
    {
      ...session,
      id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_SESSIONS);
  await writeHistory(next);
  return next[0];
}

export function subscribeMemoryMatchHistory(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMemoryMatchHistory(limit = 6) {
  const [sessions, setSessions] = useState<MemoryMatchSession[]>([]);

  useEffect(() => {
    let mounted = true;
    listMemoryMatchHistory().then((items) => {
      if (!mounted) return;
      setSessions(items.slice(0, limit));
    });
    const unsubscribe = subscribeMemoryMatchHistory((items) => {
      setSessions(items.slice(0, limit));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit]);

  return sessions;
}
