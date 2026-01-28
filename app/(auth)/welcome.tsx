import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { BloomVisual } from '@/src/components/BloomVisual';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/(auth)/sign-in' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(800).delay(200)}>
          <BloomVisual size={180} />
        </Animated.View>

        <Animated.View
          style={styles.textContainer}
          entering={FadeInUp.duration(600).delay(400)}
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
        entering={FadeInUp.duration(600).delay(600)}
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
