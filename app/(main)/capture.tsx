import { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, spacing, TextInput, Button } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { useCaptureMoment } from '@/src/hooks';
import { useAuthReady } from '@/src/auth';
import { ApiError } from '@/src/api';
import captureHeadlines from '@/src/content/captureHeadlines.json';

export default function CaptureScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const authReady = useAuthReady();
  const captureMutation = useCaptureMoment();
  const inputRef = useRef<RNTextInput | null>(null);

  const [text, setText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const captureHeadline = useMemo(() => {
    const items = captureHeadlines.capture_prompts.map((item) => item.text);
    if (items.length === 0) return 'Capture a moment';
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }, []);

  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timeout);
  }, []);

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

  const sheetEnter = motion.sheetEnter();
  const itemEnter = (delay: number) => motion.itemEnter(delay, 'up');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}
      keyboardVerticalOffset={0}
    >
      <Animated.View
        entering={sheetEnter}
        style={[
          styles.card,
          {
            backgroundColor: '#FFDC61',
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={16}>
            <X size={24} color={theme.textTertiary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <Animated.View entering={itemEnter(60)}>
              <Text variant="title" style={styles.headline}>
                {captureHeadline}
              </Text>
            </Animated.View>

            <Animated.View entering={itemEnter(150)}>
              <TextInput
                inputRef={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Start typing..."
                editable={authReady && !captureMutation.isPending}
                maxLength={280}
                multiline
                style={styles.input}
                returnKeyType="done"
              />
              <Text
                variant="caption"
                color={theme.textTertiary}
                style={styles.charCount}
              >
                {text.length}/280
              </Text>
            </Animated.View>

            {showSuccess && (
              <Animated.View style={styles.successContainer} entering={FadeIn.duration(200)}>
                <Text variant="body" color={theme.success}>
                  Saved
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </View>

        <Animated.View
          style={styles.footer}
          entering={itemEnter(230)}
        >
          <Button
            title="Capture"
            onPress={handleSubmit}
            loading={captureMutation.isPending}
            disabled={!authReady || text.trim().length === 0}
          />
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    paddingTop: spacing.xxl,
  },
  card: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  body: {
    flex: 1,
  },
  headline: {
    lineHeight: 28,
  },
  input: {
    minHeight: 140,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  charCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
    paddingRight: spacing.xs,
  },
});
