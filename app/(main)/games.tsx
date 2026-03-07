import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, Sparkles, Timer } from 'lucide-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';

export default function GamesHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const history = useImpulsePopHistory(6);
  const memoryHistory = useMemoryMatchHistory(6);
  const bestScore = history.reduce((best, entry) => Math.max(best, entry.score), 0);
  const bestMemory = memoryHistory.reduce((best, entry) => Math.max(best, entry.score), 0);
  const latest = history[0];
  const latestMemory = memoryHistory[0];

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">Games</Text>
        <Text variant="body" color={theme.textSecondary}>
          Quick cognitive games designed to feel playful and premium.
        </Text>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Brain size={18} color={theme.text} strokeWidth={1.9} />
            <Text variant="bodyMedium">Impulse Pop</Text>
          </View>
          <Text variant="small" color={theme.textSecondary}>
            Tap only the target color. Avoid decoys. 30s or 60s rounds.
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" color={theme.textTertiary}>
              Best score: {bestScore}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              Recent rounds: {history.length}
            </Text>
            {latest ? (
              <Text variant="caption" color={theme.textTertiary}>
                Last: {latest.score} pts • {latest.durationSec}s
              </Text>
            ) : (
              <Text variant="caption" color={theme.textTertiary}>
                No rounds yet
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <Button
              title="Play 30s"
              variant="secondary"
              onPress={() => router.push('/(main)/games/impulse-pop?duration=30' as any)}
            />
            <Button
              title="Play 60s"
              variant="secondary"
              icon={<Timer size={16} color={theme.text} strokeWidth={2} />}
              onPress={() => router.push('/(main)/games/impulse-pop?duration=60' as any)}
            />
          </View>
        </Card>

        {history.length > 0 ? (
          <Card style={styles.historyCard}>
            <Text variant="bodyMedium">Recent scores</Text>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text variant="small">{entry.score} pts</Text>
                <Text variant="caption" color={theme.textTertiary}>
                  {entry.durationSec}s • {entry.accuracy}% acc • {entry.bestStreak} streak
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Sparkles size={18} color={theme.text} strokeWidth={1.9} />
            <Text variant="bodyMedium">Memory Match</Text>
          </View>
          <Text variant="small" color={theme.textSecondary}>
            Flip emoji pairs with quick elastic interactions.
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" color={theme.textTertiary}>
              Best score: {bestMemory}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              Recent rounds: {memoryHistory.length}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              {latestMemory
                ? `Last: ${latestMemory.score} pts • ${latestMemory.durationSec}s`
                : 'No rounds yet'}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button
              title="Play 30s"
              variant="secondary"
              onPress={() => router.push('/(main)/games/memory-match?duration=30' as any)}
            />
            <Button
              title="Play 60s"
              variant="secondary"
              icon={<Timer size={16} color={theme.text} strokeWidth={2} />}
              onPress={() => router.push('/(main)/games/memory-match?duration=60' as any)}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Tracking</Text>
          <Text variant="small" color={theme.textSecondary}>
            Run PHQ-9, GAD-7 and Cantril checks and view trends.
          </Text>
          <View style={styles.actions}>
            <Button
              title="Assessments"
              variant="secondary"
              onPress={() => router.push('/(main)/assessments' as any)}
            />
            <Button
              title="Profile"
              variant="secondary"
              onPress={() => router.push('/(main)/profile' as any)}
            />
          </View>
        </Card>
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
  actions: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.xs,
    gap: 2,
  },
  historyCard: {
    gap: spacing.xs,
  },
  historyRow: {
    gap: 2,
    paddingVertical: 2,
  },
});
