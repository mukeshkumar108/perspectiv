import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { scoreBand } from '@/src/assessments/model';
import { useAssessmentResults } from '@/src/assessments/storage';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  const assessments = useAssessmentResults(20);
  const impulse = useImpulsePopHistory(20);
  const memory = useMemoryMatchHistory(20);

  const bestImpulse = impulse.reduce((best, item) => Math.max(best, item.score), 0);
  const bestMemory = memory.reduce((best, item) => Math.max(best, item.score), 0);
  const latestAssessment = assessments[0];

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <Text variant="title">Profile</Text>
        <Text variant="body" color={theme.textSecondary}>
          Latest stats and trends from games and assessments.
        </Text>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Game highs</Text>
          <Text variant="small" color={theme.textSecondary}>
            Impulse Pop best: {bestImpulse}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Memory Match best: {bestMemory}
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            Sessions saved locally on your device.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Assessments</Text>
          {latestAssessment ? (
            <>
              <Text variant="small" color={theme.textSecondary}>
                Latest: {latestAssessment.type.toUpperCase()} {latestAssessment.score}/{latestAssessment.maxScore}
              </Text>
              <Text variant="caption" color={theme.textTertiary}>
                Band: {scoreBand(latestAssessment.type, latestAssessment.score)}
              </Text>
            </>
          ) : (
            <Text variant="small" color={theme.textSecondary}>
              No assessments completed yet.
            </Text>
          )}
        </Card>

        <View style={styles.actions}>
          <Button title="Open Assessments" variant="secondary" onPress={() => router.push('/(main)/assessments' as any)} />
          <Button title="Open Games" variant="secondary" onPress={() => router.push('/(main)/(tabs)/games' as any)} />
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
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
});
