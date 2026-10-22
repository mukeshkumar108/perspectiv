import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';

import { Overline, ScreenContainer, Text, brand, sessionAccents, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { MomentCard } from '@/src/components/MomentCard';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useStreaks, useVoiceLibrary } from '@/src/hooks';

const KIND_ACCENT: Record<string, string> = {
  moment: sessionAccents.evening.base,
  intention: sessionAccents.morning.base,
  self: sessionAccents.ten_things.base,
};

function dayLabel(d: Date): string {
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { data: streaks } = useStreaks();
  const { data, isLoading, error, refetch } = useVoiceLibrary();
  const items = data?.items ?? [];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = items.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;

  const groups: { key: string; label: string; entries: typeof items }[] = [];
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(item);
    else groups.push({ key, label: dayLabel(d), entries: [item] });
  }

  return (
    <ScreenContainer ambient={false} safeBottom={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={motion.itemEnter(40, 'up')}>
          <Text variant="hero">Your days</Text>
        </Animated.View>

        <Animated.View entering={motion.itemEnter(110, 'up')} style={[styles.summary, { backgroundColor: brand.pinkSoft }]}>
          <View style={[styles.glow, { backgroundColor: brand.pink }]} />
          <View style={styles.streakRow}>
            <Text variant="hero" style={styles.streak}>
              {streaks?.currentStreak ?? 0}
            </Text>
            <View style={styles.streakText}>
              <Text variant="bodyMedium" medium>
                day streak
              </Text>
              <Text variant="caption" color={theme.textSecondary}>
                Longest {streaks?.longestStreak ?? 0}
              </Text>
            </View>
          </View>
          <WeekStrip dates={items.map((i) => new Date(i.createdAt))} />
          <View style={styles.miniStats}>
            <View>
              <Overline color={theme.textSecondary}>This week</Overline>
              <Text variant="title">{thisWeek}</Text>
            </View>
            <View>
              <Overline color={theme.textSecondary}>Kept in all</Overline>
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
          <View style={styles.empty}>
            <View style={[styles.emptyDot, { borderColor: theme.border }]} />
            <Text variant="title" center>
              Nothing yet
            </Text>
            <Text variant="body" center color={theme.textTertiary}>
              Have a spoken session and what you name will be kept here, one day at a time.
            </Text>
          </View>
        ) : (
          groups.map((group, gi) => (
            <Animated.View key={group.key} entering={FadeInDown.delay(Math.min(gi, 5) * 70 + 160).duration(320)} style={styles.group}>
              <Overline>{group.label}</Overline>
              <View style={styles.rail}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <View style={styles.cards}>
                  {group.entries.map((entry) => (
                    <View key={entry.id} style={styles.entry}>
                      <View style={[styles.node, { backgroundColor: KIND_ACCENT[entry.card?.kind ?? 'moment'] ?? brand.pink, borderColor: theme.background }]} />
                      <MomentCard card={entry.card} createdAt={entry.createdAt} showDate={false} />
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.lg },
  summary: { borderRadius: 28, padding: spacing.lg, gap: spacing.lg, overflow: 'hidden' },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -70, top: -90, opacity: 0.35 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streak: { fontSize: 64, lineHeight: 68 },
  streakText: { gap: 2 },
  miniStats: { flexDirection: 'row', gap: spacing.xxl },
  group: { gap: spacing.sm },
  rail: { flexDirection: 'row', gap: spacing.md },
  line: { width: 2, borderRadius: 1, marginLeft: 6, opacity: 0.7 },
  cards: { flex: 1, gap: spacing.md },
  entry: { position: 'relative' },
  node: { position: 'absolute', left: -spacing.md - 10, top: 18, width: 14, height: 14, borderRadius: 7, borderWidth: 3, zIndex: 2 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyDot: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', marginBottom: spacing.sm },
});
