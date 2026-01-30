import { Pressable, StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useStreaks, useMoments } from '@/src/hooks';
import { useMomentCache } from '@/src/storage';
import type { MomentItem } from '@/src/api/schemas';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
}

function MomentListItem({ item }: { item: MomentItem }) {
  const theme = useTheme();

  return (
    <View style={styles.momentItem}>
      <Text
        variant="body"
        numberOfLines={2}
        style={styles.momentText}
      >
        {item.text || '(No text)'}
      </Text>
      <Text variant="caption" color={theme.textTertiary}>
        {formatDate(item.createdAt)}
      </Text>
    </View>
  );
}

function mergeMoments(local: MomentItem[], remote: MomentItem[]) {
  const seenTextDates = new Set<string>();
  const seenIds = new Set<string>();
  const merged: MomentItem[] = [];
  const all = [...local, ...remote];

  for (const item of all) {
    const key = `${item.text ?? ''}::${item.createdAt}`;
    if (item.id && seenIds.has(item.id)) continue;
    if (seenTextDates.has(key)) continue;
    seenTextDates.add(key);
    if (item.id) seenIds.add(item.id);
    merged.push(item);
  }

  return merged;
}

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: streaksData } = useStreaks();
  const { data: momentsData, isLoading: momentsLoading } = useMoments(20);

  const cachedMoments = useMomentCache(20) as MomentItem[];
  const moments = mergeMoments(cachedMoments, momentsData?.items ?? []);
  const showLoading = moments.length === 0 && momentsLoading;

  return (
    <ScreenContainer style={{ backgroundColor: '#F0F0EB' }}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <View style={styles.headerRow}>
            <View>
              <Text variant="title">History</Text>
              <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
                A record of days.
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
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text variant="hero" color={theme.text}>
              {streaksData?.totalReflections ?? 0}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              Reflections
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text variant="hero" color={theme.text}>
              {streaksData?.longestStreak ?? 0}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              Longest streak
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={styles.momentsSection}
          entering={FadeInUp.duration(600).delay(300)}
        >
          <Text variant="caption" color={theme.textTertiary} style={styles.sectionTitle}>
            Recent moments
          </Text>

          {showLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.textSecondary} />
            </View>
          ) : moments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text variant="body" color={theme.textTertiary} center>
                No moments yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={moments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MomentListItem item={item} />}
              scrollEnabled={false}
              contentContainerStyle={styles.momentsList}
            />
          )}
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
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 16,
    paddingVertical: spacing.lg,
  },
  momentsSection: {
    marginTop: spacing.xxl,
    flex: 1,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  momentsList: {
    paddingBottom: spacing.lg,
  },
  momentItem: {
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  momentText: {
    lineHeight: 24,
  },
});
