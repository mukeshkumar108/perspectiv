import { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Settings, Check } from 'lucide-react-native';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { StreakBadge, MoodPicker } from '@/src/components';
import { useToday, useStreaks, useSubmitMood } from '@/src/hooks';
import { useAuthReady } from '@/src/auth';

function formatDateLabel(): string {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = dayNames[now.getDay()];
  const date = now.getDate();
  const month = monthNames[now.getMonth()];
  return `${day} · ${date} ${month}`;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

interface GreetingResult {
  primary: string;
  secondary: string | null;
}

function getGreeting(
  name: string,
  hasReflected: boolean,
  hasMood: boolean
): GreetingResult {
  const timeOfDay = getTimeOfDay();
  const dayOfYear = getDayOfYear();

  // Primary greeting pools (time-based)
  const primaryPools = {
    morning: [
      `Good morning, ${name}.`,
      'Morning.',
      'A new day.',
    ],
    afternoon: [
      'Good afternoon.',
      'Midday.',
      'Checking in.',
    ],
    evening: [
      'Good evening.',
      'End of the day.',
      'Before the day fades.',
    ],
  };

  // Secondary greeting pools (state-based)
  const secondaryPools = {
    notReflected: [
      "There's time for one thought.",
      'Take a minute.',
      'Pause here.',
    ],
    reflected: [
      "That's done for today.",
      'Marked.',
    ],
    noMood: [
      'Where are you at?',
      'Name it.',
    ],
    moodLogged: [
      'Noted.',
      'Logged.',
    ],
  };

  const primaryPool = primaryPools[timeOfDay];
  const primary = primaryPool[dayOfYear % primaryPool.length];

  // Determine secondary line (reflection > mood priority)
  let secondary: string | null = null;
  if (!hasReflected) {
    const pool = secondaryPools.notReflected;
    secondary = pool[dayOfYear % pool.length];
  } else if (hasReflected) {
    const pool = secondaryPools.reflected;
    secondary = pool[dayOfYear % pool.length];
  } else if (!hasMood) {
    const pool = secondaryPools.noMood;
    secondary = pool[dayOfYear % pool.length];
  } else if (hasMood) {
    const pool = secondaryPools.moodLogged;
    secondary = pool[dayOfYear % pool.length];
  }

  return { primary, secondary };
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useUser();
  const authReady = useAuthReady();

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

  const moodMutation = useSubmitMood();
  const [refreshing, setRefreshing] = useState(false);
  const [submittedMood, setSubmittedMood] = useState<number | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchToday(), refetchStreaks()]);
    setRefreshing(false);
  }, [refetchToday, refetchStreaks]);

  const firstName = user?.firstName || 'there';
  const dateLabel = useMemo(() => formatDateLabel(), []);
  const isLoading = todayLoading || streaksLoading;
  const hasReflectedToday =
    todayData?.hasReflected ?? todayData?.hasReflectedToday ?? false;
  const hasMood = todayData?.hasMood ?? false;

  const greeting = useMemo(
    () => getGreeting(firstName, hasReflectedToday, hasMood),
    [firstName, hasReflectedToday, hasMood]
  );

  const handleReflect = () => {
    if (hasReflectedToday) return;
    router.push('/(main)/reflect' as any);
  };

  const handleCapture = () => {
    router.push('/(main)/capture' as any);
  };

  const handleMoodSelect = async (rating: number) => {
    await moodMutation.mutateAsync({ rating });
    setSubmittedMood(rating);
  };

  // Use local state if available, otherwise show generic indicator when hasMood
  const displayMood = submittedMood ?? (hasMood ? 3 : null);

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
        {/* Top row: date on left, streak + settings on right */}
        <Animated.View
          style={styles.topRow}
          entering={FadeInUp.duration(600).delay(100)}
        >
          <Text variant="caption" color={theme.textTertiary}>
            {dateLabel}
          </Text>
          <View style={styles.topRowActions}>
            <StreakBadge count={streaksData?.currentStreak ?? 0} />
            <Pressable
              onPress={() => router.push('/(main)/account' as any)}
              hitSlop={12}
            >
              <Settings size={20} color={theme.textTertiary} strokeWidth={1.5} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Greeting headline */}
        <Animated.View
          style={styles.greetingContainer}
          entering={FadeInUp.duration(600).delay(150)}
        >
          <Text variant="hero">{greeting.primary}</Text>
          {greeting.secondary && (
            <Text variant="body" color={theme.textTertiary} style={styles.greetingSecondary}>
              {greeting.secondary}
            </Text>
          )}
        </Animated.View>

        {/* Mood picker */}
        <Animated.View
          style={styles.moodContainer}
          entering={FadeInUp.duration(600).delay(200)}
        >
          <MoodPicker
            onSelect={handleMoodSelect}
            disabled={!authReady || moodMutation.isPending}
            currentMood={displayMood}
            showChangeOption={hasMood}
          />
        </Animated.View>

        {/* Spacer to replace bloom visual */}
        <View style={styles.spacer} />

        {/* Prompt */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : todayData?.prompt ? (
          <Animated.View
            style={styles.promptSection}
            entering={FadeInUp.duration(600).delay(300)}
          >
            <Text variant="body" style={styles.promptText}>
              {todayData.prompt.text}
            </Text>
          </Animated.View>
        ) : null}

        {/* Actions */}
        <Animated.View
          style={styles.actions}
          entering={FadeInUp.duration(600).delay(400)}
        >
          {hasReflectedToday ? (
            <>
              <Button
                title="Capture a moment"
                onPress={handleCapture}
              />
              <View style={styles.reflectedStamp}>
                <Check size={16} color={theme.textTertiary} strokeWidth={2} />
                <Text variant="small" color={theme.textTertiary}>
                  Reflected
                </Text>
              </View>
            </>
          ) : (
            <>
              <Button
                title="Reflect"
                onPress={handleReflect}
              />
              <Button
                title="Capture a moment"
                variant="ghost"
                onPress={handleCapture}
              />
            </>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greetingContainer: {
    marginBottom: spacing.xxl,
  },
  greetingSecondary: {
    marginTop: spacing.sm,
  },
  moodContainer: {
    paddingVertical: spacing.lg,
  },
  spacer: {
    height: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  promptSection: {
    paddingVertical: spacing.lg,
  },
  promptText: {
    lineHeight: 28,
    color: '#6B6965',
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  reflectedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
});
