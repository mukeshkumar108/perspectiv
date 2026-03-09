import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3, Flame, ListChecks, Trophy, X } from 'lucide-react-native';
import * as Skia from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Button, Card, ScreenContainer, SurfaceGradient, Text, spacing } from '@/src/ui';
import { addStroopBloomSession } from '@/src/games/stroopBloom/storage';

type ColorKey = 'gold' | 'coral' | 'mint' | 'sky';

const COLORS: Record<ColorKey, { label: string; hex: string }> = {
  gold: { label: 'YELLOW', hex: '#FFD11A' },
  coral: { label: 'PINK', hex: '#FF3D7A' },
  mint: { label: 'GREEN', hex: '#00D08A' },
  sky: { label: 'BLUE', hex: '#24B3FF' },
};

const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];
const NEON: Record<ColorKey, { glow: string; rim: string; deep: string; light: string }> = {
  gold: { glow: 'rgba(255,220,64,0.34)', rim: 'rgba(255,203,76,0.7)', deep: '#D89205', light: '#FFD75A' },
  coral: { glow: 'rgba(255,77,167,0.34)', rim: 'rgba(255,108,183,0.72)', deep: '#BE1D59', light: '#FF5E98' },
  mint: { glow: 'rgba(36,255,185,0.32)', rim: 'rgba(64,226,170,0.7)', deep: '#069B6C', light: '#24DEA9' },
  sky: { glow: 'rgba(68,205,255,0.34)', rim: 'rgba(92,193,242,0.72)', deep: '#0A7DC8', light: '#45BBF6' },
};

type Trial = {
  id: string;
  bubbleColor: ColorKey;
  wordColor: ColorKey;
  distractorColor: ColorKey;
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

function makeTrial(
  index: number,
  context: { incongruentSeen: number; bubbleDistractorSeen: number },
): Trial {
  const incongruenceChance = index < 3 ? 0 : Math.min(0.72, 0.28 + (index - 3) * 0.035);
  const congruent = Math.random() >= incongruenceChance;
  const bubbleColor = pickRandom(COLOR_KEYS);
  const wordColor = congruent
    ? bubbleColor
    : pickRandom(COLOR_KEYS.filter((key) => key !== bubbleColor));
  const wrongPool = COLOR_KEYS.filter((key) => key !== wordColor);
  const nonBubbleWrongPool = wrongPool.filter((key) => key !== bubbleColor);
  let wrong: ColorKey;

  if (congruent) {
    wrong = pickRandom(wrongPool);
  } else {
    const nextIncongruentSeen = context.incongruentSeen + 1;
    const targetBubbleDistractors = Math.round(nextIncongruentSeen * 0.7);
    const needsBubbleToCatchUp = context.bubbleDistractorSeen < targetBubbleDistractors;
    const canUseBubbleDistractor = bubbleColor !== wordColor;
    const fallbackWrong = nonBubbleWrongPool.length > 0 ? pickRandom(nonBubbleWrongPool) : pickRandom(wrongPool);

    if (canUseBubbleDistractor && (needsBubbleToCatchUp || Math.random() < 0.7)) {
      wrong = bubbleColor;
    } else {
      wrong = fallbackWrong;
    }
  }

  const options = Math.random() > 0.5 ? [wordColor, wrong] : [wrong, wordColor];
  const deadlineMs = Math.max(900, 2300 - Math.min(1400, index * 75));

  return {
    id: `trial_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    bubbleColor,
    wordColor,
    distractorColor: wrong,
    options: options as [ColorKey, ColorKey],
    congruent,
    deadlineMs,
  };
}

function NeonMainBubble({ color }: { color: ColorKey }) {
  const { Canvas, Circle, Group, BlurMask, RadialGradient, vec } = Skia;
  const tint = NEON[color];
  return (
    <Canvas style={styles.mainBubbleCanvas}>
      <Group>
        <Circle cx={180} cy={180} r={112} color={tint.glow}>
          <BlurMask blur={52} style="normal" />
        </Circle>
        <Circle cx={180} cy={180} r={90} color={tint.glow}>
          <BlurMask blur={28} style="normal" />
        </Circle>
      </Group>

      <Circle cx={180} cy={180} r={92}>
        <RadialGradient
          c={vec(160, 158)}
          r={100}
          colors={[tint.light, COLORS[color].hex, tint.deep]}
        />
      </Circle>
      <Circle cx={180} cy={180} r={88} color={tint.rim} style="stroke" strokeWidth={1.2}>
        <BlurMask blur={0.8} style="normal" />
      </Circle>
    </Canvas>
  );
}

export default function StroopBloomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string; autostart?: string }>();

  const [phase, setPhase] = useState<'idle' | 'countdown' | 'playing' | 'results'>('idle');
  const [selectedDurationSec, setSelectedDurationSec] = useState<30 | 60>(30);
  const [countdown, setCountdown] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(selectedDurationSec * 1000);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trial, setTrial] = useState<Trial>(() => makeTrial(0, { incongruentSeen: 0, bubbleDistractorSeen: 0 }));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [saved, setSaved] = useState(false);

  const startedAtRef = useRef(0);
  const gameStartRef = useRef(0);
  const durationMsRef = useRef(selectedDurationSec * 1000);
  const trialDeadlineRef = useRef(0);
  const trialRef = useRef<Trial>(trial);
  const trialIndexRef = useRef(0);
  const incongruentSeenRef = useRef(0);
  const bubbleDistractorSeenRef = useRef(0);
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
    const nextTrial = makeTrial(nextIndex, {
      incongruentSeen: incongruentSeenRef.current,
      bubbleDistractorSeen: bubbleDistractorSeenRef.current,
    });

    if (!nextTrial.congruent) {
      incongruentSeenRef.current += 1;
      if (nextTrial.distractorColor === nextTrial.bubbleColor) {
        bubbleDistractorSeenRef.current += 1;
      }
    }

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
    incongruentSeenRef.current = 0;
    bubbleDistractorSeenRef.current = 0;
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
    transform: [{ scale: 2.22 + growProgress.value * 0.48 }],
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
      <View style={styles.content}>
        <View style={styles.topHud}>
          <View style={styles.hudInline}>
            <View style={styles.hudItem}>
              <Clock3 size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{mmss}</Text>
            </View>
            <View style={styles.hudItem}>
              <Trophy size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{score}</Text>
            </View>
            <View style={styles.hudItem}>
              <Flame size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{streak}</Text>
            </View>
            <View style={styles.hudItem}>
              <ListChecks size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{stats.trials}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeIconButton} hitSlop={12}>
            <X size={20} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>

        <View style={styles.arena}>
          <SurfaceGradient
            startColor="#070A1D"
            endColor="#1D1142"
            glows={[
              { x: 0.14, y: 0.12, radius: 0.9, color: 'rgba(255,79,205,0.22)' },
              { x: 0.86, y: 0.9, radius: 0.92, color: 'rgba(60,226,255,0.2)' },
              { x: 0.82, y: 0.14, radius: 0.62, color: 'rgba(131,84,255,0.28)' },
            ]}
          />

          <View style={styles.centerWrap}>
            <Animated.View
              style={[
                styles.mainBubbleMotion,
                bubbleGrowStyle,
              ]}
            >
              <NeonMainBubble color={trial.bubbleColor} />
            </Animated.View>
            <View pointerEvents="none" style={styles.wordWrap}>
              <Text variant="title" color="#FFFFFF" style={styles.wordLabel}>
                {COLORS[trial.wordColor].label}
              </Text>
            </View>
          </View>

          <View style={styles.choiceRow}>
            {trial.options.map((option) => (
              <Pressable
                key={option}
                style={styles.choiceButton}
                onPress={() => handleChoice(option)}
                disabled={phase !== 'playing'}
              >
                <View style={[styles.choiceControl, { backgroundColor: COLORS[option].hex }]}>
                  <View style={styles.choiceControlRim} />
                </View>
              </Pressable>
            ))}
          </View>

          {phase !== 'playing' ? (
            <View style={styles.overlay}>
              {phase === 'countdown' ? (
                <>
                  <Text variant="hero" color="#FFFFFF">{countdown}</Text>
                  <Text variant="body" color="#D6CFFF">Get ready</Text>
                </>
              ) : phase === 'results' ? (
                <Card style={styles.resultCard}>
                  <Text variant="title" color="#1F1A2F">Round complete</Text>
                  <Text variant="hero" color="#171322">{score}</Text>
                  <Text variant="small" color="#5F557F">Accuracy {stats.accuracy}%</Text>
                  <Text variant="small" color="#5F557F">
                    Incongruent acc {stats.incongruentAccuracy}% • Median {stats.reactionMedian} ms
                  </Text>
                  <Text variant="small" color="#5F557F">
                    Stroop cost {stats.stroopCost} ms • Best streak {bestStreak}
                  </Text>
                  <View style={styles.resultActions}>
                    <Button title="Play again" onPress={resetToIdle} />
                    <Button title="Back to games" variant="secondary" onPress={() => router.back()} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.startCard}>
                  <Text variant="small" color="#5F557F">
                    Read the word in the center bubble and tap its meaning color below. Ignore the bubble color.
                  </Text>
                  <Text variant="bodyMedium" color="#1F1A2F">Choose round length</Text>
                  <View style={styles.modeRow}>
                    <Pressable
                      onPress={() => setSelectedDurationSec(30)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 30 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor: selectedDurationSec === 30 ? '#1F1A2F' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 30 ? '#FFFFFF' : '#5F557F'}>
                        30s
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedDurationSec(60)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 60 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor: selectedDurationSec === 60 ? '#1F1A2F' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 60 ? '#FFFFFF' : '#5F557F'}>
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
  content: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  hudInline: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
    alignItems: 'center',
  },
  hudItem: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6CFEE',
    backgroundColor: '#F6F4FD',
    paddingHorizontal: spacing.sm,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudValue: {
    fontWeight: '700',
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#16131F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  arena: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(178,151,255,0.5)',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  mainBubbleMotion: {
    width: 260,
    height: 260,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBubbleCanvas: {
    width: 360,
    height: 360,
    position: 'absolute',
    left: -50,
    top: -50,
  },
  wordWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordLabel: {
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: -10,
    paddingBottom: spacing.xl,
    zIndex: 3,
  },
  choiceButton: {
    width: 92,
    height: 92,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  choiceControl: {
    width: 74,
    height: 74,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(27,22,48,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceControlRim: {
    width: '86%',
    height: '86%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(17,13,34,0.22)',
    padding: spacing.md,
  },
  startCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
