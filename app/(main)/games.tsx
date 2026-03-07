import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Pressable } from 'react-native';
import { ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';
import { useStroopBloomHistory } from '@/src/games/stroopBloom/storage';
import { GameHubItem } from '@/src/games/GameHubItem';

export default function GamesHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const impulse = useImpulsePopHistory(20);
  const memory = useMemoryMatchHistory(20);
  const stroop = useStroopBloomHistory(20);

  const impulseBest = impulse.reduce((best, item) => Math.max(best, item.score), 0);
  const memoryBest = memory.reduce((best, item) => Math.max(best, item.score), 0);
  const stroopBest = stroop.reduce((best, item) => Math.max(best, item.score), 0);

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">Games</Text>
        <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
          Choose a game. Each one starts with a short explainer before play.
        </Text>

        <View style={styles.section}>
          <Text variant="caption" color={theme.textTertiary} style={styles.sectionTitle}>
            Cognitive
          </Text>
          <View style={styles.list}>
            <GameHubItem
              title="Impulse Pop"
              subtitle="Selective attention and impulse control."
              meta={`Best score: ${impulseBest}`}
              onPress={() => router.push('/(main)/games/impulse-pop' as any)}
            />
            <GameHubItem
              title="Memory Match"
              subtitle="Working memory and sustained focus."
              meta={`Best score: ${memoryBest}`}
              onPress={() => router.push('/(main)/games/memory-match' as any)}
            />
            <GameHubItem
              title="Stroop Bloom"
              subtitle="Cognitive inhibition under visual conflict."
              meta={`Best score: ${stroopBest}`}
              onPress={() => router.push('/(main)/games/stroop-bloom' as any)}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  list: {
    gap: spacing.sm,
  },
});
