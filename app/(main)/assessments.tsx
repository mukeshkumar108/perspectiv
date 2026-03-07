import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, BrainCircuit, Gauge } from 'lucide-react-native';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { getAssessmentTitle, scoreBand, type AssessmentType } from '@/src/assessments/model';
import { useAssessmentResults } from '@/src/assessments/storage';

export default function AssessmentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const results = useAssessmentResults(12);

  const latestByType = (type: AssessmentType) =>
    results.find((entry) => entry.type === type);

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">Assessments</Text>
        <Text variant="body" color={theme.textSecondary}>
          Track PHQ-9, GAD-7 and Cantril Ladder scores over time.
        </Text>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Activity size={18} color={theme.text} strokeWidth={1.9} />
            <Text variant="bodyMedium">PHQ-9</Text>
          </View>
          <Text variant="small" color={theme.textSecondary}>
            9 items for depressive symptom tracking.
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            {latestByType('phq9')
              ? `Latest: ${latestByType('phq9')?.score}/27 (${scoreBand('phq9', latestByType('phq9')?.score ?? 0)})`
              : 'No score yet'}
          </Text>
          <Button
            title="Start PHQ-9"
            variant="secondary"
            onPress={() => router.push('/(main)/assessments/phq9' as any)}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <BrainCircuit size={18} color={theme.text} strokeWidth={1.9} />
            <Text variant="bodyMedium">GAD-7</Text>
          </View>
          <Text variant="small" color={theme.textSecondary}>
            7 items for anxiety symptom tracking.
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            {latestByType('gad7')
              ? `Latest: ${latestByType('gad7')?.score}/21 (${scoreBand('gad7', latestByType('gad7')?.score ?? 0)})`
              : 'No score yet'}
          </Text>
          <Button
            title="Start GAD-7"
            variant="secondary"
            onPress={() => router.push('/(main)/assessments/gad7' as any)}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Gauge size={18} color={theme.text} strokeWidth={1.9} />
            <Text variant="bodyMedium">Cantril Ladder</Text>
          </View>
          <Text variant="small" color={theme.textSecondary}>
            One quick check on overall life evaluation today.
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            {latestByType('cantril')
              ? `Latest: ${latestByType('cantril')?.score}/10 (${scoreBand('cantril', latestByType('cantril')?.score ?? 0)})`
              : 'No score yet'}
          </Text>
          <Button
            title="Start Cantril"
            variant="secondary"
            onPress={() => router.push('/(main)/assessments/cantril' as any)}
          />
        </Card>

        {results.length > 0 ? (
          <Card style={styles.historyCard}>
            <Text variant="bodyMedium">Recent submissions</Text>
            {results.slice(0, 8).map((entry) => (
              <Text key={entry.id} variant="caption" color={theme.textTertiary}>
                {getAssessmentTitle(entry.type)}: {entry.score}/{entry.maxScore} ({scoreBand(entry.type, entry.score)})
              </Text>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  scroll: {
    flex: 1,
  },
  card: {
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyCard: {
    gap: spacing.xs,
  },
});
