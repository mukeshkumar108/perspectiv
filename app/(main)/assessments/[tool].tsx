import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, FadeInUp, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import { Burst, Overline, PressScale, PrimaryButton, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import {
  getAssessmentMaxScore,
  getAssessmentPrompt,
  getAssessmentPurpose,
  getAssessmentQuestions,
  getAssessmentTitle,
  PHQ_GAD_OPTIONS,
  scoreBand,
  type AssessmentType,
} from '@/src/assessments/model';
import { addAssessmentResult } from '@/src/assessments/storage';

function isAssessmentType(value: string): value is AssessmentType {
  return value === 'phq9' || value === 'gad7' || value === 'cantril';
}

const ACCENT = { phq9: sessionAccents.evening, gad7: sessionAccents.daytime, cantril: sessionAccents.ten_things } as const;
const MINUTES = { phq9: 2, gad7: 1, cantril: 1 } as const;

/** Counts up to a number, so a result arrives instead of just appearing. */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (to <= 0) return;
    const steps = Math.min(24, to * 3);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setValue(Math.round((to * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 34);
    return () => clearInterval(id);
  }, [to]);
  return (
    <Text variant="hero" style={styles.bigScore}>
      {value}
    </Text>
  );
}

function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  const theme = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(ratio, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [ratio, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return (
    <View style={[styles.track, { backgroundColor: theme.border }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

export default function AssessmentToolScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tool?: string }>();
  const theme = useTheme();

  const rawTool = typeof params.tool === 'string' ? params.tool : '';
  const tool: AssessmentType = isAssessmentType(rawTool) ? rawTool : 'phq9';
  const accent = ACCENT[tool];
  const questions = useMemo(() => getAssessmentQuestions(tool), [tool]);
  const maxScore = getAssessmentMaxScore(tool);

  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [burst, setBurst] = useState(0);
  const savedRef = useRef(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const score = answers.reduce((sum, value) => sum + value, 0);
  const isComplete = index >= questions.length;
  const current = questions[Math.min(index, questions.length - 1)];
  const currentAnswer = answers[index];
  const isCantril = tool === 'cantril';
  const needsSupport = tool === 'phq9' && (answers[8] ?? 0) > 0;

  useEffect(() => () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  // The result is kept the moment the last answer is given: nothing to remember to press.
  useEffect(() => {
    if (!isComplete || savedRef.current) return;
    savedRef.current = true;
    void addAssessmentResult({ type: tool, score, maxScore, answers });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBurst((n) => n + 1);
  }, [isComplete, tool, score, maxScore, answers]);

  const chooseAnswer = (value: number) => {
    if (isComplete) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    // The three-way questions move on by themselves after a beat; the ladder waits for Finish.
    if (!isCantril) {
      if (advanceRef.current) clearTimeout(advanceRef.current);
      advanceRef.current = setTimeout(() => setIndex((i) => Math.min(questions.length, i + 1)), 320);
    }
  };

  const goBack = () => {
    if (index <= 0) {
      setStarted(false);
      return;
    }
    setIndex(index - 1);
  };

  return (
    <ScreenContainer safeBottom ambient={false} style={styles.screen}>
      <ScreenHeader title={getAssessmentTitle(tool)} />

      {!started ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp.duration(320)} style={[styles.hero, { backgroundColor: accent.soft }]}>
              <View style={[styles.glow, { backgroundColor: accent.base }]} />
              <Text variant="hero">{getAssessmentTitle(tool)}</Text>
              <Text variant="body" color={theme.textSecondary}>
                {getAssessmentPurpose(tool)}
              </Text>
              <View style={styles.tags}>
                <View style={[styles.tag, { backgroundColor: theme.surface }]}>
                  <Text variant="caption" medium>
                    {isCantril ? '1 question' : `${questions.length} questions`}
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: theme.surface }]}>
                  <Text variant="caption" medium>
                    About {MINUTES[tool]} min
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: theme.surface }]}>
                  <Text variant="caption" medium>
                    Stays on this device
                  </Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.block}>
              <Overline>How it works</Overline>
              <Text variant="body" color={theme.textSecondary}>
                {getAssessmentPrompt(tool)}
              </Text>
              <Text variant="body" color={theme.textSecondary}>
                {isCantril ? 'Pick the step on the ladder that fits today.' : 'Choose the answer that fits best for each one. There are no right answers.'}
              </Text>
            </View>

            <Text variant="caption" color={theme.textTertiary}>
              This is a self-check, not a diagnosis.
            </Text>
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton title="Begin" arrow onPress={() => setStarted(true)} />
          </View>
        </>
      ) : !isComplete ? (
        <>
          <View style={styles.progress}>
            <Overline>{`Question ${index + 1} of ${questions.length}`}</Overline>
            <ProgressBar ratio={(index + (currentAnswer == null ? 0 : 1)) / questions.length} color={accent.base} />
          </View>

          <Animated.View key={current.id} entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(160)} style={styles.question}>
            <Text variant="title" style={styles.questionText}>
              {current.text}
            </Text>

            {isCantril ? (
              <View style={styles.ladder}>
                <View style={styles.rungs}>
                  {Array.from({ length: 11 }, (_, i) => i).map((value) => {
                    const selected = currentAnswer === value;
                    return (
                      <PressScale
                        key={value}
                        onPress={() => chooseAnswer(value)}
                        accessibilityRole="button"
                        accessibilityLabel={`${value}`}
                        accessibilityState={{ selected }}
                        style={[styles.rung, { backgroundColor: selected ? theme.text : theme.surface, borderColor: selected ? theme.text : theme.border }]}
                      >
                        <Text variant="bodyMedium" medium color={selected ? theme.background : theme.text}>
                          {value}
                        </Text>
                      </PressScale>
                    );
                  })}
                </View>
                <View style={styles.ends}>
                  <Text variant="caption" color={theme.textTertiary}>
                    Worst possible
                  </Text>
                  <Text variant="caption" color={theme.textTertiary}>
                    Best possible
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.options}>
                {PHQ_GAD_OPTIONS.map((option) => {
                  const selected = currentAnswer === option.value;
                  return (
                    <PressScale
                      key={option.label}
                      onPress={() => chooseAnswer(option.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.option, { backgroundColor: selected ? theme.text : theme.surface, borderColor: selected ? theme.text : theme.border }]}
                    >
                      <Text variant="bodyMedium" medium={selected} color={selected ? theme.background : theme.text} style={styles.optionText}>
                        {option.label}
                      </Text>
                      {selected ? <Check size={18} color={theme.background} strokeWidth={2.4} /> : null}
                    </PressScale>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <View style={styles.footerRow}>
            <View style={styles.half}>
              <PrimaryButton title="Back" variant="outline" onPress={goBack} />
            </View>
            {isCantril ? (
              <View style={styles.half}>
                <PrimaryButton title="Finish" disabled={currentAnswer == null} onPress={() => setIndex(questions.length)} />
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp.duration(420)} style={[styles.result, { backgroundColor: accent.soft }]}>
              <View style={[styles.glow, { backgroundColor: accent.base }]} />
              <Burst color={accent.base} run={burst} spread={120} />
              <Overline color={theme.textSecondary}>Your result</Overline>
              <View style={styles.scoreRow}>
                <CountUp to={score} />
                <Text variant="title" color={theme.textSecondary}>
                  {` / ${maxScore}`}
                </Text>
              </View>
              <View style={[styles.band, { backgroundColor: theme.surface }]}>
                <Text variant="small" medium>
                  {scoreBand(tool, score)}
                </Text>
              </View>
              <Text variant="caption" color={theme.textSecondary}>
                A self-check, not a diagnosis. Kept on this device.
              </Text>
            </Animated.View>

            {needsSupport ? (
              <Animated.View entering={FadeInUp.delay(300).duration(320)} style={[styles.support, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="bodyMedium" medium>
                  If you have had thoughts of harming yourself
                </Text>
                <Text variant="small" color={theme.textSecondary}>
                  You do not have to carry that alone. In the UK, Samaritans are free any time on 116 123. In the US, call or text 988.
                </Text>
                <PrimaryButton title="Call Samaritans 116 123" variant="outline" onPress={() => void Linking.openURL('tel:116123')} />
              </Animated.View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton title="Done" onPress={() => router.replace('/(main)/assessments' as any)} />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  footer: { paddingBottom: spacing.md, paddingTop: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md, paddingTop: spacing.sm },
  half: { flex: 1 },
  hero: { borderRadius: 28, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -70, top: -80, opacity: 0.4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { borderRadius: 999, paddingHorizontal: spacing.sm + 2, paddingVertical: 5 },
  block: { gap: spacing.sm },
  progress: { gap: spacing.sm, marginBottom: spacing.lg },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  question: { flex: 1, gap: spacing.lg },
  questionText: { marginBottom: spacing.xs },
  options: { gap: spacing.sm },
  option: { minHeight: 60, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  optionText: { flex: 1 },
  ladder: { gap: spacing.sm },
  rungs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rung: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  result: { borderRadius: 28, padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start', overflow: 'hidden', minHeight: 240 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bigScore: { fontSize: 72, lineHeight: 78 },
  band: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  support: { borderWidth: 1, borderRadius: 24, padding: spacing.lg, gap: spacing.sm },
});
