import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text, brand, sessionAccents, spacing } from '@/src/ui';

const GO_GREEN = '#58C98F';
import { useTheme } from '@/src/ui/useTheme';
import { CountdownOverlay, GameShell, ResultScreen, median, useGameRun } from '@/src/games/kit';
import { addFlashSession, listFlashHistory } from '@/src/games/flash/storage';

const ROUNDS = 8;
type Stage = 'wait' | 'go' | 'hit' | 'early';

const points = (ms: number) => Math.max(0, Math.round((650 - ms) / 4));

export default function FlashPlay() {
  const theme = useTheme();
  const accent = sessionAccents.morning;
  const { phase, count, restart } = useGameRun(60 * 60);

  const [stage, setStage] = useState<Stage>('wait');
  const [round, setRound] = useState(1);
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [lastMs, setLastMs] = useState(0);
  const [done, setDone] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);
  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);

  const score = times.reduce((sum, ms) => sum + points(ms), 0);

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    setStage('wait');
    timer.current = setTimeout(() => {
      goAt.current = Date.now();
      setStage('go');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1200 + Math.random() * 2000);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      setRound(1);
      setTimes([]);
      setFalseStarts(0);
      setDone(false);
      setStage('wait');
      savedRef.current = false;
    }
    if (phase === 'playing') schedule();
  }, [phase]);

  useEffect(() => {
    if (stage === 'go') {
      pulse.value = withRepeat(withSequence(withTiming(1.05, { duration: 380, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) })), -1);
    } else {
      pulse.value = withSpring(1);
    }
  }, [stage, pulse]);

  const press = () => {
    if (phase !== 'playing' || done) return;
    if (stage === 'wait') {
      if (timer.current) clearTimeout(timer.current);
      setStage('early');
      setFalseStarts((n) => n + 1);
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      timer.current = setTimeout(schedule, 1000);
    } else if (stage === 'go') {
      const ms = Date.now() - goAt.current;
      setLastMs(ms);
      setStage('hit');
      const nextTimes = [...times, ms];
      setTimes(nextTimes);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      timer.current = setTimeout(() => {
        if (nextTimes.length >= ROUNDS) {
          setDone(true);
        } else {
          setRound(nextTimes.length + 1);
          schedule();
        }
      }, 1000);
    }
  };

  const med = median(times);
  const fastest = times.length ? Math.min(...times) : 0;
  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  useEffect(() => {
    if (!done || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const history = await listFlashHistory();
      setPreviousBest(history.length ? Math.max(...history.map((h) => h.score)) : null);
      await addFlashSession({ score, reactionMedian: med, fastest, average, falseStarts });
    })();
  }, [done, score, med, fastest, average, falseStarts]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }, { translateX: shake.value }] }));

  if (done) {
    return (
      <ResultScreen
        title="Flash"
        accent={accent}
        score={score}
        previousBest={previousBest}
        stats={[
          { label: 'Median', value: `${med} ms` },
          { label: 'Fastest', value: `${fastest} ms` },
          { label: 'Average', value: `${average} ms` },
          { label: 'Early taps', value: String(falseStarts) },
        ]}
        onAgain={() => {
          restart();
        }}
      />
    );
  }

  const fill = stage === 'go' ? GO_GREEN : stage === 'hit' ? accent.base : stage === 'early' ? theme.border : theme.surface;
  const label = stage === 'wait' ? 'Wait' : stage === 'go' ? 'Tap' : stage === 'hit' ? `${lastMs} ms` : 'Too soon';
  const sub = stage === 'wait' ? 'for green' : stage === 'hit' ? `+${points(lastMs)}` : stage === 'early' ? 'Round restarts' : 'now';

  return (
    <GameShell accent={accent.base} score={score} timeLeftMs={(ROUNDS - times.length) * 1000} durationMs={ROUNDS * 1000} clockLabel={`Round ${round} of ${ROUNDS}`} showHud={phase === 'playing'}>
      <Pressable style={styles.stage} onPressIn={press} accessibilityRole="button" accessibilityLabel="Tap when the circle turns green">
        <Animated.View style={[styles.circle, { backgroundColor: fill, borderColor: stage === 'wait' ? theme.text : 'transparent' }, circle]}>
          <Text variant="hero" style={styles.label}>
            {label}
          </Text>
          <Text variant="body" color={theme.textSecondary}>
            {sub}
          </Text>
        </Animated.View>
        <View style={styles.dots}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < times.length ? brand.accent : theme.border }]} />
          ))}
        </View>
      </Pressable>
      {phase === 'countdown' ? <CountdownOverlay count={count} accent={accent.base} hint="Tap when the circle turns green" /> : null}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  circle: { width: 240, height: 240, borderRadius: 120, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 36, lineHeight: 42 },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
