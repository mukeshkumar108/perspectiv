import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Burst, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { CountdownOverlay, GameShell, ResultScreen, median, percent, useGameRun } from '@/src/games/kit';
import { addImpulsePopSession, listImpulsePopHistory } from '@/src/games/impulsePop/storage';

const COLORS = [
  { key: 'pink', name: 'pink', hex: '#FF7DAF' },
  { key: 'blue', name: 'blue', hex: '#4D9DF0' },
  { key: 'green', name: 'green', hex: '#2FB67C' },
  { key: 'yellow', name: 'yellow', hex: '#F2B632' },
] as const;

const TARGET_EVERY_MS = 10_000;
const MAX_ON_SCREEN = 7;

type Bubble = { id: number; x: number; y: number; size: number; color: number; bornAt: number; expiresAt: number };

function BubbleView({ bubble, onHit }: { bubble: Bubble; onHit: () => void }) {
  const appear = useSharedValue(0);
  const float = useSharedValue(0);
  const c = COLORS[bubble.color];

  useEffect(() => {
    appear.value = withSpring(1, { damping: 11, stiffness: 220 });
    float.value = withDelay((bubble.id % 5) * 90, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1));
  }, [appear, float, bubble.id]);

  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, appear.value * 1.4), transform: [{ translateY: -3 * float.value }, { scale: 0.3 + 0.7 * appear.value }] }));

  return (
    <Animated.View style={[styles.bubbleWrap, { left: bubble.x - bubble.size / 2, top: bubble.y - bubble.size / 2, width: bubble.size, height: bubble.size }, style]}>
      <Pressable onPressIn={onHit} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${c.name} bubble`} style={[styles.bubble, { backgroundColor: c.hex, borderRadius: bubble.size / 2, shadowColor: c.hex }]}>
        <View style={[styles.shine, { width: bubble.size * 0.34, height: bubble.size * 0.2, top: bubble.size * 0.16, left: bubble.size * 0.2 }]} />
      </Pressable>
    </Animated.View>
  );
}

export default function ImpulsePopPlay() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ duration?: string }>();
  const durationSec = params.duration === '60' ? 60 : 30;
  const accent = sessionAccents.evening;

  const { phase, count, timeLeftMs, restart } = useGameRun(durationSec);
  const [arena, setArena] = useState({ w: 0, h: 0 });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [missed, setMissed] = useState(0);
  const [reactions, setReactions] = useState<number[]>([]);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  const idRef = useRef(1);
  const targetRef = useRef(0);
  const streakRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const lastSpawn = useRef(0);
  const savedRef = useRef(false);
  const runStart = useRef(0);
  const shake = useSharedValue(0);

  const setBubbleList = (list: Bubble[]) => {
    bubblesRef.current = list;
    setBubbles(list);
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    setBubbleList([]);
    setScore(0);
    setStreak(0);
    streakRef.current = 0;
    setBestStreak(0);
    setCorrect(0);
    setWrong(0);
    setMissed(0);
    setReactions([]);
    setBursts([]);
    const first = Math.floor(Math.random() * 4);
    targetRef.current = first;
    setTarget(first);
    savedRef.current = false;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' || arena.w === 0) return;
    runStart.current = Date.now();
    lastSpawn.current = 0;
    let lastTargetChange = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - runStart.current) / (durationSec * 1000));

      // The cue changes now and then, so what was a target becomes a decoy.
      if (now - lastTargetChange > TARGET_EVERY_MS) {
        lastTargetChange = now;
        const others = [0, 1, 2, 3].filter((i) => i !== targetRef.current);
        const nextTarget = others[Math.floor(Math.random() * others.length)];
        targetRef.current = nextTarget;
        setTarget(nextTarget);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      let list = bubblesRef.current;
      const expired = list.filter((b) => b.expiresAt <= now);
      if (expired.length) {
        list = list.filter((b) => b.expiresAt > now);
        const missedTargets = expired.filter((b) => b.color === targetRef.current).length;
        if (missedTargets) {
          setMissed((m) => m + missedTargets);
          setScore((s) => Math.max(0, s - 2 * missedTargets));
          streakRef.current = 0;
          setStreak(0);
        }
      }

      const every = 640 - 280 * progress;
      if (list.length < MAX_ON_SCREEN && now - lastSpawn.current > every) {
        lastSpawn.current = now;
        const size = 62 + Math.random() * 28;
        const color = Math.random() < 0.45 ? targetRef.current : Math.floor(Math.random() * 4);
        for (let tries = 0; tries < 8; tries += 1) {
          const x = size / 2 + 6 + Math.random() * (arena.w - size - 12);
          const y = size / 2 + 6 + Math.random() * (arena.h - size - 12);
          if (list.every((b) => Math.hypot(b.x - x, b.y - y) > (b.size + size) / 2 + 8)) {
            list = [...list, { id: idRef.current++, x, y, size, color, bornAt: now, expiresAt: now + 1400 + Math.random() * 900 }];
            break;
          }
        }
      }
      if (list !== bubblesRef.current) setBubbleList(list);
    }, 90);
    return () => clearInterval(id);
  }, [phase, arena.w, arena.h, durationSec]);

  const hit = (bubble: Bubble) => {
    if (phase !== 'playing') return;
    if (!bubblesRef.current.some((b) => b.id === bubble.id)) return;
    setBubbleList(bubblesRef.current.filter((b) => b.id !== bubble.id));
    const hex = COLORS[bubble.color].hex;
    setBursts((list) => [...list.slice(-5), { id: bubble.id, x: bubble.x, y: bubble.y, color: hex }]);

    if (bubble.color === targetRef.current) {
      const s = streakRef.current + 1;
      streakRef.current = s;
      const mult = s >= 10 ? 1.5 : s >= 5 ? 1.25 : 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setCorrect((c) => c + 1);
      setScore((v) => v + Math.round(10 * mult));
      setReactions((r) => [...r, Date.now() - bubble.bornAt]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setWrong((w) => w + 1);
      setScore((v) => Math.max(0, v - 6));
      shake.value = withSequence(withTiming(-8, { duration: 45 }), withTiming(8, { duration: 60 }), withTiming(-4, { duration: 55 }), withTiming(0, { duration: 50 }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const attempts = correct + wrong + missed;
  const accuracy = percent(correct, attempts);
  const reaction = median(reactions);

  useEffect(() => {
    if (phase !== 'results' || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const history = await listImpulsePopHistory();
      setPreviousBest(history.length ? Math.max(...history.map((h) => h.score)) : null);
      await addImpulsePopSession({ durationSec, score, bestStreak, accuracy, reactionMedian: reaction });
    })();
  }, [phase, durationSec, score, bestStreak, accuracy, reaction]);

  const arenaStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (phase === 'results') {
    return (
      <ResultScreen
        title="Impulse Pop"
        accent={accent}
        score={score}
        previousBest={previousBest}
        stats={[
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Reaction', value: reaction ? `${reaction} ms` : '–' },
          { label: 'Best streak', value: String(bestStreak) },
          { label: 'Decoys tapped', value: String(wrong) },
          { label: 'Targets missed', value: String(missed) },
          { label: 'Hits', value: String(correct) },
        ]}
        onAgain={restart}
      />
    );
  }

  const t = COLORS[target];
  return (
    <GameShell accent={accent.base} score={score} timeLeftMs={timeLeftMs} durationMs={durationSec * 1000} showHud={phase === 'playing'}>
      <View style={styles.cueRow}>
        <Animated.View key={t.key} entering={ZoomIn.springify().damping(12)} style={[styles.cue, { backgroundColor: theme.surface }]}>
          <Text variant="small" color={theme.textSecondary}>
            Tap only
          </Text>
          <View style={[styles.cueDot, { backgroundColor: t.hex }]} />
          <Text variant="bodyMedium" medium>
            {t.name}
          </Text>
        </Animated.View>
        {streak >= 5 ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[styles.mult, { backgroundColor: accent.soft }]}>
            <Text variant="small" medium>
              ×{streak >= 10 ? '1.5' : '1.25'}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View style={[styles.arena, { backgroundColor: theme.surface }, arenaStyle]} onLayout={(e) => setArena({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {bubbles.map((b) => (
          <BubbleView key={b.id} bubble={b} onHit={() => hit(b)} />
        ))}
        {bursts.map((b) => (
          <View key={b.id} pointerEvents="none" style={[styles.burstAnchor, { left: b.x - 1, top: b.y - 1 }]}>
            <Burst color={b.color} run={1} spread={52} />
          </View>
        ))}
      </Animated.View>

      {phase === 'countdown' ? <CountdownOverlay count={count} accent={accent.base} hint="Tap only the colour at the top" /> : null}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  cueRow: { alignItems: 'center', justifyContent: 'center', height: 48, marginBottom: spacing.sm },
  cue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  cueDot: { width: 18, height: 18, borderRadius: 9 },
  mult: { position: 'absolute', right: 0, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 5 },
  arena: { flex: 1, borderRadius: 32, marginBottom: spacing.lg, overflow: 'hidden' },
  bubbleWrap: { position: 'absolute' },
  bubble: { flex: 1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, overflow: 'hidden' },
  shine: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '-24deg' }] },
  burstAnchor: { position: 'absolute', width: 2, height: 2 },
});
