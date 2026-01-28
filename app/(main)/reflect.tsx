import { useState, useEffect } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, ExternalLink } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, TextInput, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useAuthReady } from '@/src/auth';
import { useToday, useSubmitReflection } from '@/src/hooks';
import { ApiError } from '@/src/api';

export default function ReflectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: todayData } = useToday();
  const submitMutation = useSubmitReflection();
  const authReady = useAuthReady();

  const [responseText, setResponseText] = useState('');
  const [showSafetyResources, setShowSafetyResources] = useState(false);

  // Handle already reflected
  useEffect(() => {
    if (todayData?.hasReflectedToday) {
      Alert.alert(
        'Already done',
        "You already reflected today. Come back tomorrow.",
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [todayData?.hasReflectedToday, router]);

  const handleClose = () => {
    Keyboard.dismiss();
    router.back();
  };

  const handleSubmit = async () => {
    if (!authReady) return;
    if (!responseText.trim()) return;

    try {
      const result = await submitMutation.mutateAsync({
        responseText: responseText.trim(),
      });

      if (result.safetyFlagged) {
        setShowSafetyResources(true);
        return;
      }

      // Navigate to success with message
      router.replace({
        pathname: '/(main)/success' as any,
        params: { message: result.message || 'Reflection saved' },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          return;
        }
        if (error.status === 403) {
          Alert.alert('Not authorized', 'Not authorized.');
          return;
        }
        if (error.status === 409) {
          Alert.alert(
            'Already done',
            "You already reflected today. Come back tomorrow.",
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      }
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleCallCrisisLine = () => {
    Linking.openURL('tel:988');
  };

  const handleDismissSafety = () => {
    setShowSafetyResources(false);
    router.back();
  };

  if (showSafetyResources) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleDismissSafety} hitSlop={16}>
            <X size={24} color={theme.text} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.safetyContent}>
          <Animated.View entering={FadeInUp.duration(600)}>
            <Text variant="title" center>
              We noticed something
            </Text>
            <Text
              variant="body"
              color={theme.textSecondary}
              center
              style={styles.safetySubtitle}
            >
              {"If you're going through a difficult time, support is available."}
            </Text>
          </Animated.View>

          <Animated.View
            style={styles.safetyActions}
            entering={FadeInUp.duration(600).delay(200)}
          >
            <Card>
              <Text variant="bodyMedium">Crisis Text Line</Text>
              <Text variant="small" color={theme.textSecondary}>
                Text HOME to 741741
              </Text>
            </Card>

            <Button
              title="Call 988 (Suicide & Crisis Lifeline)"
              variant="secondary"
              onPress={handleCallCrisisLine}
            />

            <Pressable
              style={styles.learnMore}
              onPress={() => Linking.openURL('https://findahelpline.com/')}
            >
              <Text variant="small" color={theme.textSecondary}>
                Find help in your country
              </Text>
              <ExternalLink size={14} color={theme.textSecondary} />
            </Pressable>
          </Animated.View>

          <Button
            title="Go back"
            variant="ghost"
            onPress={handleDismissSafety}
            style={styles.backButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={spacing.md}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={16}>
              <X size={24} color={theme.text} strokeWidth={1.5} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View entering={FadeInUp.duration(600).delay(100)}>
              <Text variant="caption" color={theme.textTertiary}>
                {"Today's prompt"}
              </Text>
              <Text variant="title" style={styles.prompt}>
                {todayData?.prompt?.text || "What's on your mind?"}
              </Text>
            </Animated.View>

            <Animated.View
              style={styles.inputContainer}
              entering={FadeInUp.duration(600).delay(200)}
            >
              <TextInput
                placeholder="Write your reflection..."
                value={responseText}
                onChangeText={setResponseText}
                multiline
                autoFocus
                style={styles.input}
              />
            </Animated.View>
          </View>
        </ScrollView>

      <Animated.View
        style={styles.footer}
        entering={FadeInUp.duration(600).delay(300)}
      >
        <Button
          title="Save reflection"
          onPress={handleSubmit}
          disabled={!responseText.trim() || !authReady}
          loading={submitMutation.isPending}
        />
        {!authReady ? (
          <Text variant="small" color={theme.textSecondary} style={styles.authMessage}>
            Preparing secure session…
          </Text>
        ) : null}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
  },
  prompt: {
    marginTop: spacing.sm,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    flex: 1,
    minHeight: 200,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  authMessage: {
    marginTop: spacing.xs,
  },
  safetyContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  safetySubtitle: {
    marginTop: spacing.sm,
  },
  safetyActions: {
    gap: spacing.md,
  },
  learnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
