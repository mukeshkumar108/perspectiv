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
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { Composer, MoodPicker } from '@/src/components';
import { useAuthReady } from '@/src/auth';
import { useToday, useSubmitReflection, useSubmitMood } from '@/src/hooks';
import { ApiError } from '@/src/api';

export default function ReflectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: todayData } = useToday();
  const submitMutation = useSubmitReflection();
  const moodMutation = useSubmitMood();
  const authReady = useAuthReady();
  const hasReflectedToday =
    todayData?.hasReflected ?? todayData?.hasReflectedToday ?? false;

  const [responseText, setResponseText] = useState('');
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  const [step, setStep] = useState<'mood' | 'reflect'>('mood');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  useEffect(() => {
    if (!hasReflectedToday) return;
    setResponseText('');
  }, [hasReflectedToday]);

  const handleClose = () => {
    Keyboard.dismiss();
    router.back();
  };

  const handleMoodSelect = async (rating: number) => {
    setSelectedMood(rating);
    try {
      await moodMutation.mutateAsync({ rating });
    } catch {
      // Offline-first; ignore submission errors here.
    }
  };

  const handleContinue = () => {
    setStep('reflect');
  };

  const handleSubmit = async () => {
    if (!authReady || hasReflectedToday) return;
    if (!responseText.trim()) return;

    try {
      const result = await submitMutation.mutateAsync({
        responseText: responseText.trim(),
      });

      if (result.safetyFlagged) {
        setShowSafetyResources(true);
        return;
      }

      router.replace({
        pathname: '/(main)/success' as any,
        params: {
          message:
            result.successMessage || result.message || 'Reflection saved',
        },
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
            <X size={24} color={theme.textTertiary} strokeWidth={1.5} />
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

  if (step === 'mood') {
    return (
      <ScreenContainer style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={16}>
            <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
          </Pressable>
        </View>

        <View style={styles.moodStep}>
          <Animated.View entering={FadeInUp.duration(600).delay(100)}>
            <Text variant="title" style={styles.moodTitle}>
              First, let’s check in.
            </Text>
            <Text variant="body" color={theme.textSecondary} style={styles.moodSubtitle}>
              How are you feeling right now?
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)}>
            <MoodPicker
              onSelect={handleMoodSelect}
              disabled={!authReady || moodMutation.isPending}
              currentMood={selectedMood}
              showChangeOption={false}
              alwaysShowPicker
              iconColor={theme.text}
              selectedIconColor={theme.surface}
              selectedBackgroundColor={theme.text}
              selectedScale={1.2}
            />
          </Animated.View>
        </View>

        <View style={styles.moodFooter}>
          <Button title="Continue" onPress={handleContinue} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: theme.surface }]}>
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
              <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View entering={FadeInUp.duration(600).delay(100)}>
              <Text variant="title" style={styles.prompt}>
                {todayData?.prompt?.text || "What's on your mind?"}
              </Text>
            </Animated.View>
          </View>
        </ScrollView>

        <Animated.View
          style={styles.composerContainer}
          entering={FadeInUp.duration(600).delay(200)}
        >
          <Composer
            value={responseText}
            onChangeText={setResponseText}
            onSubmit={handleSubmit}
            placeholder="Write your reflection..."
            disabled={!authReady || hasReflectedToday}
            loading={submitMutation.isPending}
            maxLength={2000}
            maxHeight={200}
          />
          {!authReady && (
            <Text
              variant="small"
              color={theme.textSecondary}
              style={styles.statusMessage}
            >
              Preparing secure session...
            </Text>
          )}
          {hasReflectedToday && (
            <Text
              variant="small"
              color={theme.textSecondary}
              style={styles.statusMessage}
            >
              Already reflected today
            </Text>
          )}
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
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  moodStep: {
    flex: 1,
    gap: spacing.xl,
  },
  moodTitle: {
    marginBottom: spacing.sm,
  },
  moodSubtitle: {
    lineHeight: 22,
  },
  moodFooter: {
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
  },
  prompt: {
    marginTop: spacing.sm,
  },
  composerContainer: {
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  statusMessage: {
    textAlign: 'center',
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
