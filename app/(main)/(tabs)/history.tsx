import { Pressable, StyleSheet, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useStreaks } from '@/src/hooks';

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: streaksData } = useStreaks();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <View style={styles.headerRow}>
            <View>
              <Text variant="title">History</Text>
              <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
                Your reflection journey
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(main)/debug' as any)} hitSlop={12}>
              <Text variant="small" color={theme.textSecondary}>
                Debug
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={styles.stats}
          entering={FadeInUp.duration(600).delay(200)}
        >
          <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
            <Text variant="hero" color={theme.accent}>
              {streaksData?.totalReflections ?? 0}
            </Text>
            <Text variant="small" color={theme.textSecondary}>
              Total reflections
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
            <Text variant="hero" color={theme.accent}>
              {streaksData?.longestStreak ?? 0}
            </Text>
            <Text variant="small" color={theme.textSecondary}>
              Longest streak
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={styles.placeholder}
          entering={FadeInUp.duration(600).delay(300)}
        >
          <Clock size={48} color={theme.textTertiary} strokeWidth={1} />
          <Text variant="body" color={theme.textSecondary} center>
            Full history coming soon
          </Text>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
