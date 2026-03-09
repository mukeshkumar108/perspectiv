import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUBBLE_RULES,
  BubbleColorKey,
  BubbleEntity,
  BurstEntity,
  clampScore,
  COLOR_MAP,
  COUNTDOWN_SECONDS,
  GamePhase,
  GAME_DURATIONS,
  randomInRange,
  ScoreState,
  SCORE_RULES,
  streakMultiplier,
  TARGET_LABEL,
} from './model';

const COLORS = Object.keys(COLOR_MAP) as BubbleColorKey[];

function randomTargetColor(): BubbleColorKey {
  return COLORS[Math.floor(Math.random() * COLORS.length)] ?? 'gold';
}

const defaultScoreState: ScoreState = {
  score: 0,
  streak: 0,
  bestStreak: 0,
  correctTaps: 0,
  wrongTaps: 0,
  missedTargets: 0,
  totalTaps: 0,
  reactionSamplesMs: [],
};

type UseImpulsePopArgs = {
  width: number;
  height: number;
  topInset?: number;
};

export function useImpulsePop({ width, height, topInset = 0 }: UseImpulsePopArgs) {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [selectedDurationSec, setSelectedDurationSec] = useState<(typeof GAME_DURATIONS)[number]>(30);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(selectedDurationSec * 1000);
  const [targetColor, setTargetColor] = useState<BubbleColorKey>(() => randomTargetColor());
  const [bubbles, setBubbles] = useState<BubbleEntity[]>([]);
  const [bursts, setBursts] = useState<BurstEntity[]>([]);
  const [score, setScore] = useState<ScoreState>(defaultScoreState);
  const [roundEndedAt, setRoundEndedAt] = useState<number | null>(null);

  const gameStartedAtRef = useRef(0);
  const gameDurationMsRef = useRef(selectedDurationSec * 1000);
  const nextSpawnAtRef = useRef(0);

  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 420);
  const safeTopInset = Math.max(0, topInset);

  const buildBubble = useCallback(
    (now: number, existing: BubbleEntity[], forcedTarget?: boolean): BubbleEntity => {
      const size = Math.round(randomInRange(BUBBLE_RULES.sizeMin, BUBBLE_RULES.sizeMax));
      const margin = size + 8;
      const yMin = margin + safeTopInset;
      const yMax = Math.max(yMin + 1, safeHeight - margin);
      const minX = margin;
      const maxX = Math.max(margin + 1, safeWidth - margin);

      let x = randomInRange(minX, maxX);
      let y = randomInRange(yMin, yMax);
      let bestCandidate = { x, y, clearance: -1 };

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const candidateX = randomInRange(minX, maxX);
        const candidateY = randomInRange(yMin, yMax);

        const nearestDistance = existing.reduce((nearest, bubble) => {
          const dx = bubble.x - candidateX;
          const dy = bubble.y - candidateY;
          const centerDistance = Math.hypot(dx, dy);
          return Math.min(nearest, centerDistance - (bubble.size + size) * 0.56);
        }, Number.POSITIVE_INFINITY);

        if (nearestDistance > bestCandidate.clearance) {
          bestCandidate = { x: candidateX, y: candidateY, clearance: nearestDistance };
        }
        if (nearestDistance > 0) {
          x = candidateX;
          y = candidateY;
          break;
        }
      }
      if (bestCandidate.clearance > -1) {
        x = bestCandidate.x;
        y = bestCandidate.y;
      }

      const isTarget =
        forcedTarget === true ? true : Math.random() < BUBBLE_RULES.targetChance;
      const color = isTarget
        ? targetColor
        : COLORS.filter((c) => c !== targetColor)[Math.floor(Math.random() * (COLORS.length - 1))] ?? 'coral';
      const lifetimeMs = randomInRange(BUBBLE_RULES.lifeMinMs, BUBBLE_RULES.lifeMaxMs);

      return {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        x,
        y,
        size,
        color,
        isTarget,
        createdAt: now,
        expiresAt: now + lifetimeMs,
      };
    },
    [safeHeight, safeTopInset, safeWidth, targetColor]
  );

  const resetState = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    setBubbles([]);
    setBursts([]);
    setScore(defaultScoreState);
    setTimeLeftMs(selectedDurationSec * 1000);
    setRoundEndedAt(null);
  }, [selectedDurationSec]);

  const startSession = useCallback(() => {
    resetState();
    gameDurationMsRef.current = selectedDurationSec * 1000;
    setPhase('countdown');
  }, [resetState, selectedDurationSec]);

  const endSession = useCallback(() => {
    setRoundEndedAt(Date.now());
    setPhase('results');
    setBubbles([]);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(COUNTDOWN_SECONDS);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          const now = Date.now();
          gameStartedAtRef.current = now;
          nextSpawnAtRef.current = now + 280;
          setTimeLeftMs(gameDurationMsRef.current);
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - gameStartedAtRef.current;
      const remaining = Math.max(0, gameDurationMsRef.current - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(id);
        endSession();
        return;
      }

      setBursts((prev) => prev.filter((b) => now - b.createdAt < BUBBLE_RULES.burstLifetimeMs));

      setBubbles((prev) => {
        let next = prev;
        const expiredTargets = prev.filter((bubble) => bubble.expiresAt <= now && bubble.isTarget).length;

        if (expiredTargets > 0) {
          setScore((current) => {
            const newScore = clampScore(current.score + SCORE_RULES.missTarget * expiredTargets);
            return {
              ...current,
              score: newScore,
              streak: 0,
              missedTargets: current.missedTargets + expiredTargets,
            };
          });
        }

        next = next.filter((bubble) => bubble.expiresAt > now);

        const progress = Math.min(1, elapsed / gameDurationMsRef.current);
        const spawnInterval =
          BUBBLE_RULES.spawnStartMs -
          (BUBBLE_RULES.spawnStartMs - BUBBLE_RULES.spawnEndMs) * progress;

        if (now >= nextSpawnAtRef.current && next.length < BUBBLE_RULES.maxOnScreen) {
          const hasTarget = next.some((b) => b.isTarget);
          const forceTarget = !hasTarget && Math.random() > 0.45;
          next = [...next, buildBubble(now, next, forceTarget ? true : undefined)];
          nextSpawnAtRef.current = now + randomInRange(spawnInterval * 0.85, spawnInterval * 1.15);
        }

        return next;
      });
    }, 66);

    return () => clearInterval(id);
  }, [buildBubble, endSession, phase]);

  const onTapBubble = useCallback(
    (tapped: BubbleEntity) => {
      if (phase !== 'playing') return;

      const now = Date.now();

      setBubbles((prev) => {
        return prev.filter((bubble) => bubble.id !== tapped.id);
      });

      setBursts((prev) => [
        ...prev,
        {
          id: `${tapped.id}-burst`,
          x: tapped.x,
          y: tapped.y,
          color: tapped.color,
          createdAt: now,
        },
      ]);

      setScore((current) => {
        if (tapped.isTarget) {
          const streak = current.streak + 1;
          const gained = Math.round(SCORE_RULES.hit * streakMultiplier(streak));
          return {
            ...current,
            score: clampScore(current.score + gained),
            streak,
            bestStreak: Math.max(current.bestStreak, streak),
            correctTaps: current.correctTaps + 1,
            totalTaps: current.totalTaps + 1,
            reactionSamplesMs: [...current.reactionSamplesMs, now - tapped.createdAt],
          };
        }

        return {
          ...current,
          score: clampScore(current.score + SCORE_RULES.wrong),
          streak: 0,
          wrongTaps: current.wrongTaps + 1,
          totalTaps: current.totalTaps + 1,
        };
      });
    },
    [phase]
  );

  const changeDuration = useCallback(
    (next: (typeof GAME_DURATIONS)[number]) => {
      setSelectedDurationSec(next);
      if (phase === 'idle' || phase === 'results') {
        setTimeLeftMs(next * 1000);
      }
    },
    [phase]
  );

  const playAgain = useCallback(() => {
    setTargetColor(randomTargetColor());
    setPhase('idle');
    resetState();
  }, [resetState]);

  const targetLabel = TARGET_LABEL[targetColor];

  const stats = useMemo(() => {
    const accuracy = score.totalTaps > 0 ? Math.round((score.correctTaps / score.totalTaps) * 100) : 0;
    const reactionSorted = [...score.reactionSamplesMs].sort((a, b) => a - b);
    const mid = Math.floor(reactionSorted.length / 2);
    const reactionMedian =
      reactionSorted.length === 0
        ? 0
        : reactionSorted.length % 2 === 0
          ? Math.round((reactionSorted[mid - 1] + reactionSorted[mid]) / 2)
          : reactionSorted[mid];

    return {
      accuracy,
      reactionMedian,
    };
  }, [score.correctTaps, score.reactionSamplesMs, score.totalTaps]);

  return {
    phase,
    countdown,
    timeLeftMs,
    bubbles,
    bursts,
    score,
    stats,
    selectedDurationSec,
    targetColor,
    targetLabel,
    onTapBubble,
    changeDuration,
    startSession,
    playAgain,
    roundEndedAt,
  };
}
