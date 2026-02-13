import { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import homeHeadlines from '@/src/content/homeHeadlines.json';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Settings } from 'lucide-react-native';
import { Image } from 'react-native';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { StreakBadge, Character } from '@/src/components';
import { useToday, useStreaks } from '@/src/hooks';

let hasPlayedHomeCharacterIntro = false;

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

function formatDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pickDailyHeadline(headlines: string[]): string {
  if (headlines.length === 0) return 'Today';
  const dateKey = formatDateKey();
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % headlines.length;
  return headlines[index];
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const introTranslateY = useSharedValue(8);

  const {
    data: todayData,
  } = useToday();
  const {
    data: streaksData,
  } = useStreaks();

  const dateLabel = useMemo(() => formatDateLabel(), []);
  const today = (todayData ?? {}) as any;
  const hasReflectedToday = today.hasReflected ?? today.hasReflectedToday ?? false;

  const dailyHeadline = useMemo(() => {
    const items = homeHeadlines.headlines.map((item) => item.text);
    return pickDailyHeadline(items);
  }, []);

  const handleReflect = () => {
    router.push('/(main)/reflect' as any);
  };

  const runCharacterIntro = () => {
    if (hasPlayedHomeCharacterIntro) {
      introTranslateY.value = 8;
      return;
    }
    hasPlayedHomeCharacterIntro = true;
    introTranslateY.value = 42;
    introTranslateY.value = withSequence(
      withTiming(-4, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(8, {
        duration: 520,
        easing: Easing.out(Easing.exp),
      })
    );
  };

  useFocusEffect(
    useCallback(
      () => {
        runCharacterIntro();
        return undefined;
      },
      []
    )
  );

  const characterIntroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: introTranslateY.value },
    ],
  }));

  return (
    <ScreenContainer padded={false} safeBottom={false}>
      <View style={styles.root}>
        <View style={styles.content}>
        {/* Top row: date on left, streak + settings on right */}
        <Animated.View
          style={styles.topRow}
          entering={motion.itemEnter(70, 'up')}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/images/bluum-logo-v1.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.dateCenter}>
            <Text variant="caption" color={theme.textTertiary}>
              {dateLabel}
            </Text>
          </View>
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
          entering={motion.itemEnter(140, 'up')}
        >
          <Text variant="hero" style={styles.headline}>
            {dailyHeadline}
          </Text>
        </Animated.View>

        {/* Spacer to reserve room for ambient character */}
        <View style={styles.spacer} />

        {/* Actions */}
        <Animated.View
          style={styles.actions}
          entering={motion.itemEnter(210, 'up')}
        >
          <Button
            title={hasReflectedToday ? 'Reflect again' : 'Reflect'}
            onPress={handleReflect}
          />
        </Animated.View>
        </View>
        <Animated.View
          style={[styles.characterDock, { bottom: tabBarHeight }, characterIntroStyle]}
          pointerEvents="none"
        >
          <Character state="idle" sizeScale={0.665} liftScale={-0.02} visibleRatio={0.5} />
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoWrap: {
    marginLeft: -spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greetingContainer: {
    marginBottom: spacing.md,
  },
  headline: {
    lineHeight: 34,
  },
  greetingSecondary: {
    marginTop: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  characterDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
