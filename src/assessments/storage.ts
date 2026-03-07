import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { AssessmentResult, AssessmentType } from './model';

const STORAGE_KEY = 'perspectiv.assessments.history';
const MAX_ITEMS = 120;

type Listener = (results: AssessmentResult[]) => void;
const listeners = new Set<Listener>();

function notify(results: AssessmentResult[]) {
  listeners.forEach((listener) => listener(results));
}

async function readResults(): Promise<AssessmentResult[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AssessmentResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeResults(results: AssessmentResult[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  notify(results);
}

export async function listAssessmentResults() {
  return readResults();
}

export async function addAssessmentResult(
  result: Omit<AssessmentResult, 'id' | 'createdAt'>
) {
  const existing = await readResults();
  const next: AssessmentResult[] = [
    {
      ...result,
      id: `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_ITEMS);
  await writeResults(next);
  return next[0];
}

export function subscribeAssessmentResults(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAssessmentResults(limit = 12, type?: AssessmentType) {
  const [results, setResults] = useState<AssessmentResult[]>([]);

  useEffect(() => {
    let mounted = true;
    listAssessmentResults().then((items) => {
      if (!mounted) return;
      const filtered = type ? items.filter((item) => item.type === type) : items;
      setResults(filtered.slice(0, limit));
    });
    const unsubscribe = subscribeAssessmentResults((items) => {
      const filtered = type ? items.filter((item) => item.type === type) : items;
      setResults(filtered.slice(0, limit));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit, type]);

  return results;
}
