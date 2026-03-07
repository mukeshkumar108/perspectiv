import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
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

export default function AssessmentToolScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tool?: string }>();
  const theme = useTheme();

  const rawTool = typeof params.tool === 'string' ? params.tool : '';
  const tool: AssessmentType = isAssessmentType(rawTool) ? rawTool : 'phq9';
  const questions = useMemo(() => getAssessmentQuestions(tool), [tool]);
  const maxScore = getAssessmentMaxScore(tool);

  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [started, setStarted] = useState(false);

  const score = answers.reduce((sum, value) => sum + value, 0);
  const isComplete = index >= questions.length;
  const current = questions[Math.min(index, questions.length - 1)];
  const currentAnswer = answers[index];

  const chooseAnswer = (value: number) => {
    if (isComplete) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  };

  const goNext = () => {
    if (currentAnswer == null) return;
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    setIndex(questions.length);
  };

  const goBack = () => {
    if (index <= 0) return;
    setIndex(index - 1);
  };

  const saveResult = async () => {
    if (saved) return;
    await addAssessmentResult({
      type: tool,
      score,
      maxScore,
      answers,
    });
    setSaved(true);
  };

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="title">{getAssessmentTitle(tool)}</Text>
        <Text variant="small" color={theme.textSecondary}>
          This is a self-check, not a diagnosis.
        </Text>
        <Card style={styles.promptCard}>
          <Text variant="small" color={theme.textSecondary}>
            {getAssessmentPrompt(tool)}
          </Text>
        </Card>

        {!started ? (
          <Card style={styles.questionCard}>
            <Text variant="bodyMedium">{getAssessmentPurpose(tool)}</Text>
            <Text variant="small" color={theme.textSecondary}>
              {tool === 'cantril'
                ? 'One quick question. Pick the ladder step that best matches today.'
                : `${questions.length} questions. Choose one option for each question.`}
            </Text>
            <Button title="Start assessment" onPress={() => setStarted(true)} />
          </Card>
        ) : !isComplete ? (
          <Animated.View
            key={current.id}
            entering={FadeInRight.duration(180)}
            exiting={FadeOutLeft.duration(150)}
          >
            <Card style={styles.questionCard}>
              <Text variant="caption" color={theme.textTertiary}>
                Question {index + 1} of {questions.length}
              </Text>
              <Text variant="bodyMedium">{current.text}</Text>

              <View style={styles.options}>
                {tool === 'cantril'
                  ? Array.from({ length: 11 }, (_, i) => i).map((value) => {
                      const selected = currentAnswer === value;
                      return (
                        <Pressable
                          key={value}
                          style={[
                            styles.optionButton,
                            {
                              borderColor: selected ? theme.text : theme.border,
                              backgroundColor: selected ? theme.surface : theme.backgroundSecondary,
                            },
                          ]}
                          onPress={() => chooseAnswer(value)}
                        >
                          <Text variant="bodyMedium">{value}</Text>
                        </Pressable>
                      );
                    })
                  : PHQ_GAD_OPTIONS.map((option) => {
                      const selected = currentAnswer === option.value;
                      return (
                        <Pressable
                          key={option.label}
                          style={[
                            styles.optionButton,
                            {
                              borderColor: selected ? theme.text : theme.border,
                              backgroundColor: selected ? theme.surface : theme.backgroundSecondary,
                            },
                          ]}
                          onPress={() => chooseAnswer(option.value)}
                        >
                          <Text variant="bodyMedium">{option.label}</Text>
                        </Pressable>
                      );
                    })}
              </View>

              <Text variant="caption" color={theme.textTertiary}>
                {currentAnswer == null
                  ? 'Select one option to continue.'
                  : tool === 'cantril'
                    ? `Selected: ${currentAnswer}`
                    : `Selected: ${PHQ_GAD_OPTIONS.find((option) => option.value === currentAnswer)?.label ?? currentAnswer}`}
              </Text>

              <View style={styles.navActions}>
                <Button
                  title="Back"
                  variant="secondary"
                  onPress={index === 0 ? () => setStarted(false) : goBack}
                />
                <Button
                  title={index === questions.length - 1 ? 'Finish' : 'Next'}
                  onPress={goNext}
                  disabled={currentAnswer == null}
                />
              </View>
            </Card>
          </Animated.View>
        ) : (
          <Card style={styles.resultCard}>
            <Text variant="title">Result</Text>
            <Text variant="hero">{score}</Text>
            <Text variant="small" color={theme.textSecondary}>
              {score}/{maxScore} • {scoreBand(tool, score)}
            </Text>
            <View style={styles.resultActions}>
              <Button
                title={saved ? 'Saved' : 'Save score'}
                onPress={saveResult}
                disabled={saved}
              />
              <Button title="Done" variant="secondary" onPress={() => router.replace('/(main)/assessments' as any)} />
            </View>
          </Card>
        )}
      </ScrollView>
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scroll: {
    flex: 1,
  },
  promptCard: {
    gap: spacing.xs,
  },
  questionCard: {
    gap: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  resultCard: {
    gap: spacing.sm,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  navActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
