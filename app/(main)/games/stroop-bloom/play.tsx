import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { addStroopBloomSession } from '@/src/games/stroopBloom/storage';

type ColorKey = 'gold' | 'coral' | 'mint' | 'sky';

const COLORS: Record<ColorKey, { label: string; hex: string }> = {
  gold: { label: 'YELLOW', hex: '#FFDC61' },
  coral: { label: 'PINK', hex: '#FF7DAF' },
  mint: { label: 'GREEN', hex: '#77D7A7' },
  sky: { label: 'BLUE', hex: '#7EC8FF' },
};

const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

type Trial = {
  id: string;
  bubbleColor: ColorKey;
  wordColor: ColorKey;
  options: [ColorKey, ColorKey];
  congruent: boolean;
  deadlineMs: number;
};

type TrialResult = {
  correct: boolean;
  congruent: boolean;
  reactionMs: number;
};

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function makeTrial(index: number): Trial {
  const congruent = index < 4 ? true : Math.random() < 0.35;
  const bubbleColor = pickRandom(COLOR_KEYS);
  const wordColor = congruent
    ? bubbleColor
    : pickRandom(COLOR_KEYS.filter((key) => key !== bubbleColor));
  const wrong = pickRandom(COLOR_KEYS.filter((key) => key !== wordColor));
  const options = Math.random() > 0.5 ? [wordColor, wrong] : [wrong, wordColor];
  const deadlineMs = Math.max(900, 2400 - Math.min(1200, index * 70));

  return {
    id: `trial_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    bubbleColor,
    wordColor,
    options: options as [ColorKey, ColorKey],
    congruent,
    deadlineMs,
  };
}

export default function StroopBloomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string; autostart?: string }>();
  const theme = useTheme();

  const [phase, setPhase] = useState<'idle' | 'countdown' | 'playing' | 'results'>('idle');
  const [selectedDurationSec, setSelectedDurationSec] = useState<30 | 60>(30);
  const [countdown, setCountdown] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(selectedDurationSec * 1000);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trial, setTrial] = useState<Trial>(() => makeTrial(0));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [noiseSeed] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 28,
      alpha: 0.12 + Math.random() * 0.18,
    }))
  );
  const [saved, setSaved] = useState(false);

  const startedAtRef = useRef(0);
  const gameStartRef = useRef(0);
  const durationMsRef = useRef(selectedDurationSec * 1000);
  const trialDeadlineRef = useRef(0);
  const trialRef = useRef<Trial>(trial);
  const trialIndexRef = useRef(0);
  const growProgress = useSharedValue(0);

  useEffect(() => {
    if (params.duration === '30' || params.duration === '60') {
      const next = Number(params.duration) as 30 | 60;
      setSelectedDurationSec(next);
      setTimeLeftMs(next * 1000);
      durationMsRef.current = next * 1000;
    }
  }, [params.duration]);

  useEffect(() => {
    if (params.autostart === '1' && phase === 'idle') {
      startSession();
    }
  }, [params.autostart, phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          const now = Date.now();
          gameStartRef.current = now;
          setTimeLeftMs(durationMsRef.current);
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const startTrial = (nextIndex: number) => {
    const nextTrial = makeTrial(nextIndex);
    trialRef.current = nextTrial;
    trialIndexRef.current = nextIndex;
    setTrial(nextTrial);
    setTrialIndex(nextIndex);
    const now = Date.now();
    startedAtRef.current = now;
    trialDeadlineRef.current = now + nextTrial.deadlineMs;
    growProgress.value = 0;
    growProgress.value = withTiming(1, { duration: nextTrial.deadlineMs, easing: Easing.linear });
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    startTrial(0);
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - gameStartRef.current;
      const remaining = Math.max(0, durationMsRef.current - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(id);
        setPhase('results');
        return;
      }

      if (now >= trialDeadlineRef.current) {
        const activeTrial = trialRef.current;
        setResults((prev) => [...prev, { correct: false, congruent: activeTrial.congruent, reactionMs: activeTrial.deadlineMs }]);
        setStreak(0);
        setScore((prev) => Math.max(0, prev - 6));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startTrial(trialIndexRef.current + 1);
      }
    }, 45);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const bubbleGrowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + growProgress.value * 0.34 }],
  }));

  const handleChoice = (choice: ColorKey) => {
    if (phase !== 'playing') return;
    const activeTrial = trialRef.current;
    const reactionMs = Math.max(80, Date.now() - startedAtRef.current);
    const correct = choice === activeTrial.wordColor;

    setResults((prev) => [...prev, { correct, congruent: activeTrial.congruent, reactionMs }]);

    if (correct) {
      const nextStreak = streak + 1;
      const gained = 10 + Math.min(14, nextStreak * 2);
      setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
      setScore((prev) => prev + gained);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 8));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    startTrial(trialIndexRef.current + 1);
  };

  const stats = useMemo(() => {
    const trials = results.length;
    const correct = results.filter((item) => item.correct).length;
    const accuracy = trials > 0 ? Math.round((correct / trials) * 100) : 0;
    const congruent = results.filter((item) => item.congruent);
    const incongruent = results.filter((item) => !item.congruent);
    const incongruentAccuracy =
      incongruent.length > 0
        ? Math.round((incongruent.filter((item) => item.correct).length / incongruent.length) * 100)
        : 0;
    const reactionMedian = median(results.map((item) => item.reactionMs));
    const congruentRt = median(congruent.filter((item) => item.correct).map((item) => item.reactionMs));
    const incongruentRt = median(incongruent.filter((item) => item.correct).map((item) => item.reactionMs));
    const stroopCost = Math.max(0, incongruentRt - congruentRt);

    return { trials, accuracy, incongruentAccuracy, reactionMedian, stroopCost };
  }, [results]);

  useEffect(() => {
    if (phase !== 'results' || saved) return;
    setSaved(true);
    void addStroopBloomSession({
      durationSec: selectedDurationSec,
      score,
      trials: stats.trials,
      accuracy: stats.accuracy,
      incongruentAccuracy: stats.incongruentAccuracy,
      reactionMedian: stats.reactionMedian,
      stroopCost: stats.stroopCost,
      bestStreak,
    });
  }, [bestStreak, phase, saved, score, selectedDurationSec, stats]);

  const mmss = useMemo(() => {
    const total = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [timeLeftMs]);

  const startSession = () => {
    setSaved(false);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setResults([]);
    setTrialIndex(0);
    durationMsRef.current = selectedDurationSec * 1000;
    setPhase('countdown');
  };

  const resetToIdle = () => {
    setPhase('idle');
    setTimeLeftMs(selectedDurationSec * 1000);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text variant="title">Stroop Bloom</Text>
            <Text variant="small" color={theme.textSecondary}>
              Tap the color named by the word, not the bubble.
            </Text>
          </View>
          <View style={styles.topMeta}>
            <Text variant="small" color={theme.textSecondary}>Time</Text>
            <Text variant="bodyMedium">{mmss}</Text>
          </View>
        </View>

        <Card style={styles.statsCard}>
          <View style={styles.statCell}>
            <Text variant="caption" color={theme.textTertiary}>Score</Text>
            <Text variant="bodyMedium">{score}</Text>
          </View>
          <View style={styles.statCell}>
            <Text variant="caption" color={theme.textTertiary}>Streak</Text>
            <Text variant="bodyMedium">{streak}</Text>
          </View>
          <View style={styles.statCell}>
            <Text variant="caption" color={theme.textTertiary}>Trials</Text>
            <Text variant="bodyMedium">{stats.trials}</Text>
          </View>
        </Card>

        <View style={[styles.arena, { backgroundColor: theme.backgroundSecondary }]}>
          {noiseSeed.map((dot) => (
            <View
              key={dot.id}
              style={[
                styles.noiseDot,
                {
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: dot.size,
                  height: dot.size,
                  opacity: dot.alpha,
                },
              ]}
            />
          ))}

          <View style={styles.centerWrap}>
            <Animated.View
              style={[
                styles.mainBubble,
                bubbleGrowStyle,
                { backgroundColor: COLORS[trial.bubbleColor].hex, borderColor: 'rgba(255,255,255,0.58)' },
              ]}
            >
              <Text variant="title" color="#FFFFFF">
                {COLORS[trial.wordColor].label}
              </Text>
            </Animated.View>
          </View>

          <View style={styles.choiceRow}>
            {trial.options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.choiceButton,
                  { backgroundColor: COLORS[option].hex, borderColor: 'rgba(255,255,255,0.8)' },
                ]}
                onPress={() => handleChoice(option)}
                disabled={phase !== 'playing'}
              />
            ))}
          </View>

          {phase !== 'playing' ? (
            <View style={styles.overlay}>
              {phase === 'countdown' ? (
                <>
                  <Text variant="hero">{countdown}</Text>
                  <Text variant="body" color={theme.textSecondary}>Get ready</Text>
                </>
              ) : phase === 'results' ? (
                <Card style={styles.resultCard}>
                  <Text variant="title">Round complete</Text>
                  <Text variant="hero">{score}</Text>
                  <Text variant="small" color={theme.textSecondary}>Accuracy {stats.accuracy}%</Text>
                  <Text variant="small" color={theme.textSecondary}>
                    Incongruent acc {stats.incongruentAccuracy}% • Median {stats.reactionMedian} ms
                  </Text>
                  <Text variant="small" color={theme.textSecondary}>
                    Stroop cost {stats.stroopCost} ms • Best streak {bestStreak}
                  </Text>
                  <View style={styles.resultActions}>
                    <Button title="Play again" onPress={resetToIdle} />
                    <Button title="Back to games" variant="secondary" onPress={() => router.back()} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.startCard}>
                  <Text variant="small" color={theme.textSecondary}>
                    Read the word in the center bubble and tap its meaning color below. Ignore the bubble color.
                  </Text>
                  <Text variant="bodyMedium">Choose round length</Text>
                  <View style={styles.modeRow}>
                    <Pressable
                      onPress={() => setSelectedDurationSec(30)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 30 ? theme.text : theme.border,
                          backgroundColor: selectedDurationSec === 30 ? theme.text : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 30 ? theme.surface : theme.text}>
                        30s
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedDurationSec(60)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 60 ? theme.text : theme.border,
                          backgroundColor: selectedDurationSec === 60 ? theme.text : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 60 ? theme.surface : theme.text}>
                        60s
                      </Text>
                    </Pressable>
                  </View>
                  <Button title="Start" onPress={startSession} />
                </Card>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topMeta: {
    alignItems: 'flex-end',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: {
    alignItems: 'center',
    minWidth: 84,
    gap: 2,
  },
  arena: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    padding: spacing.md,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  mainBubble: {
    width: 188,
    height: 188,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.sm,
    zIndex: 3,
  },
  choiceButton: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
  },
  noiseDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#888888',
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(25,21,18,0.18)',
    padding: spacing.md,
  },
  startCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modePill: {
    minWidth: 66,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
