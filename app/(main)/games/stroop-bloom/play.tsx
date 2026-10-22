import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { PressScale, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { CountdownOverlay, GameShell, ResultScreen, median, percent, useGameRun } from '@/src/games/kit';
import { addStroopBloomSession, listStroopBloomHistory } from '@/src/games/stroopBloom/storage';

const COLORS = [
  { key: 'pink', name: 'PINK', hex: '#FF7DAF' },
  { key: 'blue', name: 'BLUE', hex: '#4D9DF0' },
  { key: 'green', name: 'GREEN', hex: '#2FB67C' },
  { key: 'yellow', name: 'YELLOW', hex: '#E7A91A' },
] as const;
type Key = (typeof COLORS)[number]['key'];

const DEADLINE_MS = 2600;
const hexOf = (key: Key) => COLORS.find((c) => c.key === key)!.hex;

type Trial = { word: Key; ink: Key; congruent: boolean };
type Outcome = { correct: boolean; congruent: boolean; ms: number };

function makeTrial(previous?: Trial): Trial {
  for (let i = 0; i < 12; i += 1) {
    const word = COLORS[Math.floor(Math.random() * 4)].key;
    const congruent = Math.random() < 0.3;
    const others = COLORS.filter((c) => c.key !== word);
    const ink = congruent ? word : others[Math.floor(Math.random() * others.length)].key;
    if (!previous || word !== previous.word || ink !== previous.ink) return { word, ink, congruent };
  }
  return { word: 'pink', ink: 'blue', congruent: false };
}

export default function StroopBloomPlay() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ duration?: string }>();
  const durationSec = params.duration === '60' ? 60 : 30;
  const accent = sessionAccents.ten_things;

  const { phase, count, timeLeftMs, restart } = useGameRun(durationSec);
  const [trial, setTrial] = useState<Trial>(() => makeTrial());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ id: number; label: string; good: boolean } | null>(null);

  const trialRef = useRef(trial);
  const startedRef = useRef(0);
  const savedRef = useRef(false);
  const shake = useSharedValue(0);
  const deadline = useSharedValue(1);

  const next = (previous?: Trial) => {
    const t = makeTrial(previous);
    trialRef.current = t;
    setTrial(t);
    startedRef.current = Date.now();
    deadline.value = 1;
    deadline.value = withTiming(0, { duration: DEADLINE_MS, easing: Easing.linear });
  };

  // A new run starts with clean numbers and the first word.
  useEffect(() => {
    if (phase !== 'countdown') return;
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setOutcomes([]);
    setPopup(null);
    savedRef.current = false;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    next();
    const id = setInterval(() => {
      if (Date.now() - startedRef.current >= DEADLINE_MS) {
        const t = trialRef.current;
        setOutcomes((o) => [...o, { correct: false, congruent: t.congruent, ms: DEADLINE_MS }]);
        setStreak(0);
        setScore((s) => Math.max(0, s - 6));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        next(t);
      }
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const choose = (key: Key) => {
    if (phase !== 'playing') return;
    const t = trialRef.current;
    const ms = Math.max(90, Date.now() - startedRef.current);
    const correct = key === t.word;
    setOutcomes((o) => [...o, { correct, congruent: t.congruent, ms }]);
    if (correct) {
      const s = streak + 1;
      const gain = 10 + Math.min(14, s * 2);
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setScore((v) => v + gain);
      setPopup({ id: Date.now(), label: `+${gain}`, good: true });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setStreak(0);
      setScore((v) => Math.max(0, v - 8));
      setPopup({ id: Date.now(), label: '−8', good: false });
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 60 }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    next(t);
  };

  const trials = outcomes.length;
  const correctCount = outcomes.filter((o) => o.correct).length;
  const incongruent = outcomes.filter((o) => !o.congruent);
  const congruent = outcomes.filter((o) => o.congruent);
  const reaction = median(outcomes.filter((o) => o.correct).map((o) => o.ms));
  const incRt = median(incongruent.filter((o) => o.correct).map((o) => o.ms));
  const conRt = median(congruent.filter((o) => o.correct).map((o) => o.ms));
  const stroopCost = incRt && conRt ? Math.max(0, incRt - conRt) : 0;
  const accuracy = percent(correctCount, trials);
  const incAccuracy = percent(incongruent.filter((o) => o.correct).length, incongruent.length);

  // Keep the run once, when it ends; read the old best first so "new best" is honest.
  useEffect(() => {
    if (phase !== 'results' || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const history = await listStroopBloomHistory();
      setPreviousBest(history.length ? Math.max(...history.map((h) => h.score)) : null);
      await addStroopBloomSession({ durationSec, score, trials, accuracy, incongruentAccuracy: incAccuracy, reactionMedian: reaction, stroopCost, bestStreak });
    })();
  }, [phase, durationSec, score, trials, accuracy, incAccuracy, reaction, stroopCost, bestStreak]);

  const wordStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${deadline.value * 100}%` }));

  if (phase === 'results') {
    return (
      <ResultScreen
        title="Stroop Bloom"
        accent={accent}
        score={score}
        previousBest={previousBest}
        stats={[
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Conflict accuracy', value: `${incAccuracy}%` },
          { label: 'Reaction', value: reaction ? `${reaction} ms` : '–' },
          { label: 'Stroop cost', value: stroopCost ? `${stroopCost} ms` : '–' },
          { label: 'Best streak', value: String(bestStreak) },
          { label: 'Trials', value: String(trials) },
        ]}
        onAgain={restart}
      />
    );
  }

  return (
    <GameShell accent={accent.base} score={score} timeLeftMs={timeLeftMs} durationMs={durationSec * 1000} showHud={phase === 'playing'}>
      <View style={styles.stage}>
        <Text variant="small" color={theme.textTertiary} center style={styles.rule}>
          Tap the colour the word says. Ignore the colour it is written in.
        </Text>
        <Animated.View style={[styles.wordCard, { backgroundColor: theme.surface }, wordStyle]}>
          <Text variant="hero" style={[styles.word, { color: hexOf(trial.ink) }]}>
            {trial.word.toUpperCase()}
          </Text>
          <View style={[styles.deadline, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.deadlineFill, { backgroundColor: accent.base }, barStyle]} />
          </View>
          {popup ? (
            <Animated.View key={popup.id} style={styles.popup}>
              <Text variant="bodyMedium" medium color={popup.good ? '#2FB67C' : '#D6457B'}>
                {popup.label}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={styles.grid}>
          {COLORS.map((c) => (
            <PressScale key={c.key} onPress={() => choose(c.key)} accessibilityRole="button" accessibilityLabel={c.name} scaleTo={0.94} style={[styles.choice, { backgroundColor: c.hex }]} />
          ))}
        </View>
      </View>
      {phase === 'countdown' ? <CountdownOverlay count={count} accent={accent.base} hint="Tap the colour the word says" /> : null}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'space-between', paddingBottom: spacing.lg },
  rule: { marginTop: spacing.sm },
  wordCard: { borderRadius: 32, height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  word: { fontSize: 60, lineHeight: 68, letterSpacing: 1 },
  deadline: { position: 'absolute', left: 28, right: 28, bottom: 22, height: 4, borderRadius: 2, overflow: 'hidden' },
  deadlineFill: { height: 4, borderRadius: 2 },
  popup: { position: 'absolute', top: 18, right: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  choice: { flexBasis: '47%', flexGrow: 1, height: 96, borderRadius: 28 },
});
