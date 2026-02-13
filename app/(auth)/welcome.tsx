import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { BloomVisual } from '@/src/components/BloomVisual';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/(auth)/sign-in' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(320).delay(80)}>
          <BloomVisual size={180} />
        </Animated.View>

        <Animated.View
          style={styles.textContainer}
          entering={motion.itemEnter(140, 'up')}
        >
          <Text variant="hero" center style={styles.title}>
            Perspectiv
          </Text>
          <Text variant="body" center style={styles.subtitle}>
            A moment of reflection, every day
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={styles.footer}
        entering={motion.itemEnter(200, 'up')}
      >
        <Button title="Continue" onPress={handleContinue} />
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
  textContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    letterSpacing: -1,
  },
  subtitle: {
    opacity: 0.7,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
