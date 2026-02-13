import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing, radius } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { StreakBadge } from '@/src/components';
import { useStreaks } from '@/src/hooks';

export default function SuccessScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: streaksData } = useStreaks();

  const handleDone = () => {
    router.replace('/(main)/(tabs)' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.checkCircle, { backgroundColor: theme.successLight }]}
          entering={FadeIn.duration(260)}
        >
          <Check size={48} color={theme.success} strokeWidth={2} />
        </Animated.View>

        <Animated.View
          style={styles.textContainer}
          entering={motion.itemEnter(140, 'up')}
        >
          <Text variant="title" center>
            Noted.
          </Text>
        </Animated.View>

        <Animated.View
          style={styles.streakContainer}
          entering={motion.itemEnter(210, 'up')}
        >
          <StreakBadge count={streaksData?.currentStreak ?? 0} />
        </Animated.View>
      </View>

      <Animated.View
        style={styles.footer}
        entering={motion.itemEnter(280, 'up')}
      >
        <Button title="Done" onPress={handleDone} />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: spacing.sm,
  },
  streakContainer: {
    marginTop: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
