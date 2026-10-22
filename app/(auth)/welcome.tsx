import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PrimaryButton, PressScale, ScreenContainer, Text, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(600)}>
          <VoiceOrb state="idle" />
        </Animated.View>

        <Animated.View style={styles.textContainer} entering={motion.itemEnter(260, 'up')}>
          <Text variant="hero" center>
            Bluum
          </Text>
          <Text variant="body" center color={theme.textSecondary}>
            A few minutes of talking a day, to catch the good you would normally rush past.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={styles.footer} entering={motion.itemEnter(340, 'up')}>
        <PrimaryButton title="Get started" arrow onPress={() => router.push('/(auth)/sign-up' as any)} />
        <PressScale onPress={() => router.push('/(auth)/sign-in' as any)} style={styles.link}>
          <Text variant="small" center color={theme.textSecondary}>
            I already have an account
          </Text>
        </PressScale>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  textContainer: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  footer: { gap: spacing.sm, paddingBottom: spacing.lg },
  link: { paddingVertical: spacing.md },
});
