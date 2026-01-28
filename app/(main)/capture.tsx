import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

export default function CaptureScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <X size={24} color={theme.text} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <Text variant="title" center>
            Capture a moment
          </Text>
          <Text variant="body" center color={theme.textSecondary} style={styles.subtitle}>
            This space is ready for your next capture flow.
          </Text>
        </Animated.View>
      </View>

      <Button title="Start" onPress={() => {}} disabled />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
});
