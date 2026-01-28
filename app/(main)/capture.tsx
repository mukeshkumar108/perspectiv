import { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { Composer } from '@/src/components';
import { useCaptureMoment } from '@/src/hooks';
import { useAuthReady } from '@/src/auth';
import { ApiError } from '@/src/api';

export default function CaptureScreen() {
  const router = useRouter();
  const theme = useTheme();
  const authReady = useAuthReady();
  const captureMutation = useCaptureMoment();

  const [text, setText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClose = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!authReady || !text.trim()) return;

    try {
      await captureMutation.mutateAsync({ text: text.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);

      // Brief success feedback then navigate back
      setTimeout(() => {
        router.back();
      }, 600);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={spacing.md}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={16}>
            <X size={24} color={theme.textTertiary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(600).delay(100)}>
            <Text variant="title">Capture a moment</Text>
          </Animated.View>

          {showSuccess && (
            <Animated.View style={styles.successContainer} entering={FadeIn.duration(300)}>
              <Text variant="body" color={theme.success}>
                Saved
              </Text>
            </Animated.View>
          )}
        </View>

        <Animated.View
          style={styles.composerContainer}
          entering={FadeInUp.duration(600).delay(200)}
        >
          <Composer
            value={text}
            onChangeText={setText}
            onSubmit={handleSubmit}
            placeholder="What stood out..."
            disabled={!authReady}
            loading={captureMutation.isPending}
            maxLength={280}
          />
          <Text
            variant="caption"
            color={theme.textTertiary}
            style={styles.charCount}
          >
            {text.length}/280
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
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
    gap: spacing.lg,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  composerContainer: {
    paddingBottom: spacing.lg,
  },
  charCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
    paddingRight: spacing.xs,
  },
});
