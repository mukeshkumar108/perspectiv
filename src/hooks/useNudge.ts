import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useFlashHistory } from '../games/flash/storage';
import { useAssessmentResults } from '../assessments/storage';

const KEY = 'perspectiv.nudges.dismissed';
const DAY = 86_400_000;

export interface Nudge {
  id: 'flash' | 'cantril';
  title: string;
  /** One honest line on what it is for. */
  why: string;
  cta: string;
  route: string;
}

/** The single, gentle suggestion on Today. Quiet when there is nothing worth suggesting, and quiet for three days after "Not now". */
export function useNudge(sessionsKept: number) {
  const flash = useFlashHistory(1);
  const results = useAssessmentResults(20);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setDismissed(JSON.parse(raw)))
      .catch(() => undefined);
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = { ...prev, [id]: Date.now() };
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const now = Date.now();
  const quiet = (id: string) => now - (dismissed[id] ?? 0) < 3 * DAY;
  const lastFlash = flash[0] ? new Date(flash[0].playedAt).getTime() : 0;
  const lastCantril = results.find((r) => r.type === 'cantril');
  const lastCantrilAt = lastCantril ? new Date(lastCantril.createdAt).getTime() : 0;

  let nudge: Nudge | null = null;
  if (sessionsKept >= 2 && now - lastFlash > 5 * DAY && !quiet('flash')) {
    nudge = {
      id: 'flash',
      title: 'Thirty seconds, tap when it turns pink',
      why: 'A quick read on how alert you are today. Over weeks it shows your own pattern, and what rest and stress do to it.',
      cta: 'Try Flash',
      route: '/(main)/games/flash',
    };
  } else if (sessionsKept >= 5 && now - lastCantrilAt > 14 * DAY && !quiet('cantril')) {
    nudge = {
      id: 'cantril',
      title: 'One question about your life, today',
      why: 'A well-known single question researchers use to track how life feels overall. Yours stays on this phone.',
      cta: 'Answer it',
      route: '/(main)/assessments/cantril',
    };
  }
  return { nudge, dismiss };
}
