import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

export type RunPhase = 'countdown' | 'playing' | 'results';

/**
 * The clock every timed game shares: a 3-2-1 countdown, a timed run, then results.
 * `restart()` starts again from the countdown. The clock is wall-time based, so a slow frame never costs the player time.
 */
export function useGameRun(durationSec: number, onFinish?: () => void) {
  const [phase, setPhase] = useState<RunPhase>('countdown');
  const [count, setCount] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(durationSec * 1000);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [run, setRun] = useState(0);

  useEffect(() => {
    setPhase('countdown');
    setCount(3);
    setTimeLeftMs(durationSec * 1000);
    let n = 3;
    void Haptics.selectionAsync();
    const tick = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        void Haptics.selectionAsync();
      } else {
        clearInterval(tick);
        setCount(0);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const goTimer = setTimeout(() => {
          setPhase('playing');
          const startedAt = Date.now();
          const id = setInterval(() => {
            const left = durationSec * 1000 - (Date.now() - startedAt);
            if (left <= 0) {
              clearInterval(id);
              setTimeLeftMs(0);
              setPhase('results');
              finishRef.current?.();
            } else {
              setTimeLeftMs(left);
            }
          }, 100);
          cleanup.push(() => clearInterval(id));
        }, 520);
        cleanup.push(() => clearTimeout(goTimer));
      }
    }, 800);
    const cleanup: (() => void)[] = [() => clearInterval(tick)];
    return () => cleanup.forEach((fn) => fn());
  }, [durationSec, run]);

  const restart = useCallback(() => setRun((r) => r + 1), []);
  return { phase, count, timeLeftMs, restart };
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function median(samples: number[]) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function percent(part: number, whole: number) {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}
