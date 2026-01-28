import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Settings } from 'lucide-react-native';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { BloomVisual, StreakBadge } from '@/src/components';
import { useToday, useStreaks } from '@/src/hooks';
import { useCallback, useState } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useUser();

  const {
    data: todayData,
    isLoading: todayLoading,
    refetch: refetchToday,
  } = useToday();
  const {
    data: streaksData,
    isLoading: streaksLoading,
    refetch: refetchStreaks,
  } = useStreaks();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchToday(), refetchStreaks()]);
    setRefreshing(false);
  }, [refetchToday, refetchStreaks]);

  const firstName = user?.firstName || 'there';
  const isLoading = todayLoading || streaksLoading;
  const hasReflectedToday = todayData?.hasReflectedToday ?? false;

  const handleReflect = () => {
    if (hasReflectedToday) return;
    router.push('/(main)/reflect' as any);
  };

  const handleCapture = () => {
    router.push('/(main)/capture' as any);
  };

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.textSecondary}
        />
      }
    >
      <View style={styles.content}>
        {/* Header with greeting and streak */}
        <Animated.View
          style={styles.header}
          entering={FadeInUp.duration(600).delay(100)}
        >
          <View>
            <Text variant="title">Hi {firstName}</Text>
            <Text variant="body" color={theme.textSecondary}>
              {hasReflectedToday
                ? 'You reflected today'
                : 'Take a moment to reflect'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <StreakBadge count={streaksData?.currentStreak ?? 0} />
            <Pressable
              onPress={() => router.push('/(main)/account' as any)}
              hitSlop={12}
            >
              <Settings size={20} color={theme.textSecondary} strokeWidth={1.8} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Bloom visual */}
        <Animated.View
          style={styles.bloomContainer}
          entering={FadeIn.duration(800).delay(200)}
        >
          <BloomVisual size={220} />
        </Animated.View>

        {/* Today's prompt */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : todayData?.prompt ? (
          <Animated.View entering={FadeInUp.duration(600).delay(300)}>
            <Card style={styles.promptCard}>
              <Text variant="caption" color={theme.textTertiary}>
                {"Today's prompt"}
              </Text>
              <Text variant="body" style={styles.promptText}>
                {todayData.prompt.text}
              </Text>
            </Card>
          </Animated.View>
        ) : null}

        {/* Actions */}
        <Animated.View
          style={styles.actions}
          entering={FadeInUp.duration(600).delay(400)}
        >
          <Button
            title={hasReflectedToday ? 'Already reflected' : 'Reflect'}
            onPress={handleReflect}
            disabled={hasReflectedToday}
          />
          <Button
            title="Capture a moment"
            variant="ghost"
            onPress={handleCapture}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bloomContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  promptCard: {
    gap: spacing.sm,
  },
  promptText: {
    lineHeight: 26,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
