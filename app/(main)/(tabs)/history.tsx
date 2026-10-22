import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';

import { Overline, ScreenContainer, Text, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { MomentCard } from '@/src/components/MomentCard';
import { useStreaks, useVoiceLibrary } from '@/src/hooks';

export default function HistoryScreen() {
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { data: streaks } = useStreaks();
  const { data, isLoading, error, refetch } = useVoiceLibrary();
  const items = data?.items ?? [];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = items.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;

  return (
    <ScreenContainer ambient={false} safeBottom={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={motion.itemEnter(60, 'up')} style={styles.head}>
          <Text variant="hero">Your days</Text>
          <View style={styles.stats}>
            <View>
              <Overline>This week</Overline>
              <Text variant="title">{thisWeek}</Text>
            </View>
            <View>
              <Overline>Streak</Overline>
              <Text variant="title">{streaks?.currentStreak ?? 0}</Text>
            </View>
            <View>
              <Overline>Kept in total</Overline>
              <Text variant="title">{items.length}</Text>
            </View>
          </View>
        </Animated.View>

        {isLoading && items.length === 0 ? (
          <Text variant="small" color={theme.textTertiary}>
            Loading
          </Text>
        ) : error ? (
          <Text variant="small" color={theme.textTertiary} onPress={() => void refetch()}>
            Could not load. Tap to try again.
          </Text>
        ) : items.length === 0 ? (
          <Text variant="body" color={theme.textTertiary}>
            Your days will collect here, one moment at a time, once you have a spoken session.
          </Text>
        ) : (
          items.map((item, index) => (
            <Animated.View key={item.id} entering={motion.itemEnter(Math.min(index, 6) * 50 + 100, 'up')}>
              <MomentCard card={item.card} createdAt={item.createdAt} />
            </Animated.View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.lg },
  head: { gap: spacing.lg, marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.xl },
});
