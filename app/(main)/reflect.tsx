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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, X, Check } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { Composer, MoodPicker, Character } from '@/src/components';
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
  const { width } = useWindowDimensions();
  const hasReflectedToday =
    todayData?.hasReflected ?? todayData?.hasReflectedToday ?? false;
  const moodIconSize = Math.max(36, Math.min(56, Math.floor(width / 8)));
  const moodButtonPadding = Math.max(8, Math.min(18, Math.floor(width / 28)));

  const [responseText, setResponseText] = useState('');
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [step, setStep] = useState<'mood' | 'reflect'>('mood');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [characterAccentKey, setCharacterAccentKey] = useState(0);
  const moodProgress = useSharedValue(-1);
  const reflectionMaxLength = 2000;
  const remainingChars = reflectionMaxLength - responseText.length;
  const showNearLimit = remainingChars <= 300;

  const moodBackground = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      moodProgress.value,
      [-1, 0, 1, 2, 3, 4],
      ['#EEE2D2', '#FA8A8A', '#B8BDCC', '#98C6FD', '#76D8AA', '#FFDC61']
    ),
  }));

  useEffect(() => {
    if (!hasReflectedToday) return;
    setResponseText('');
  }, [hasReflectedToday]);

  const handleClose = () => {
    Keyboard.dismiss();
    router.back();
  };

  const handleBack = () => {
    if (step === 'reflect') {
      setStep('mood');
      return;
    }
    handleClose();
  };

  const handleMoodSelect = async (rating: number) => {
    if (selectedMood === rating) {
      setSelectedMood(null);
      setCharacterAccentKey((prev) => prev + 1);
      moodProgress.value = withSpring(-1, {
        damping: 14,
        stiffness: 180,
      });
      return;
    }

    setSelectedMood(rating);
    setCharacterAccentKey((prev) => prev + 1);
    moodProgress.value = withSpring(rating - 1, {
      damping: 14,
      stiffness: 180,
    });
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
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore haptic failures so successful submissions never show error.
      }
      setShowCelebration(true);
      setTimeout(() => {
        router.replace('/(main)/(tabs)' as any);
      }, 900);
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
        Alert.alert('Could not submit reflection', error.message);
        return;
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
          <Animated.View entering={motion.itemEnter(60, 'right')}>
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
            entering={motion.itemEnter(140, 'right')}
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

  const StepPill = ({ stepIndex }: { stepIndex: 0 | 1 }) => (
    <View
      style={styles.stepPill}
      accessibilityLabel={`Step ${stepIndex + 1} of 2`}
    >
      <View
        style={[
          styles.stepSegment,
          stepIndex === 0 && styles.stepSegmentActive,
        ]}
      />
      <View
        style={[
          styles.stepSegment,
          stepIndex === 1 && styles.stepSegmentActive,
        ]}
      />
    </View>
  );

  if (step === 'mood') {
    return (
      <ScreenContainer
        style={[styles.container, { backgroundColor: theme.surface }]}
        ambient={false}
      >
        <Animated.View style={[styles.moodBackground, moodBackground]} />
        <View style={styles.moodCharacterDock} pointerEvents="none">
          <Character
            state="idle"
            alignment="center"
            mood={selectedMood}
            accentKey={characterAccentKey}
          />
        </View>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={16}>
            <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={handleClose} hitSlop={16}>
            <X size={22} color={theme.text} strokeWidth={1.6} />
          </Pressable>
        </View>

        <View style={styles.moodStep}>
          <Animated.View entering={motion.itemEnter(60, 'right')}>
            <StepPill stepIndex={0} />
            <Text variant="title" style={styles.moodTitle}>
              How are you feeling right now?
            </Text>
            <Text variant="body" color={theme.textSecondary} style={styles.moodSubtitle}>
              Take a second. It helps.
            </Text>
          </Animated.View>

          <Animated.View entering={motion.itemEnter(150, 'right')}>
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
              showLabel={false}
              iconSize={moodIconSize}
              buttonPadding={moodButtonPadding}
            />
          </Animated.View>

          <Animated.View entering={motion.itemEnter(230, 'right')} style={styles.moodInlineCta}>
            <Button
              title={selectedMood ? 'Continue' : 'Skip for now'}
              onPress={handleContinue}
              variant={selectedMood ? 'primary' : 'secondary'}
              withArrow={Boolean(selectedMood)}
            />
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      style={[styles.container, { backgroundColor: theme.background }]}
      ambient={false}
    >
      <View style={styles.reflectFlowerWrap} pointerEvents="none">
        <Svg width="760" height="760" viewBox="220 -30 180 180">
          <G transform="rotate(-18 300 45)">
            <Path d="M302.7 30L313.3 76C315.8 87 306.9 97 295.7 96C284.2 95 277.1 83 282.1 72L302.7 30Z" fill="#FFFFFF" />
            <Path d="M316.5 43L275 68C265.4 73 253 68 250.4 57C247.8 46 257.2 36 268.7 37L316.5 43Z" fill="#FFFFFF" />
            <Path d="M307.5 60L271.2 29C262.8 22 264 9 273.6 3C283.6 -2 296.4 3 298.6 14L307.5 60Z" fill="#FFFFFF" />
            <Path d="M288.2 57L307.2 14C311.7 4 324.8 1 333.3 8C342.1 15 340.6 29 330.5 35L288.2 57Z" fill="#FFFFFF" />
            <Path d="M285.2 38L333.2 43C344.4 44 351.3 55 347 65C342.5 76 328.7 79 320.3 71L285.2 38Z" fill="#FFFFFF" />
          </G>
        </Svg>
      </View>
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
            <Pressable onPress={handleBack} hitSlop={16}>
              <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
            </Pressable>
            <Pressable onPress={handleClose} hitSlop={16}>
              <X size={22} color={theme.text} strokeWidth={1.6} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View entering={motion.itemEnter(60, 'right')}>
              <StepPill stepIndex={1} />
              <Text
                variant="caption"
                color={theme.textTertiary}
                style={styles.reflectLabel}
              >
                Today&apos;s reflection
              </Text>
              <Text variant="title" style={styles.prompt}>
                {todayData?.prompt?.text || "What's on your mind?"}
              </Text>
            </Animated.View>
          </View>
        </ScrollView>

        <Animated.View
          style={styles.composerContainer}
          entering={motion.itemEnter(220, 'right')}
        >
          <Composer
            value={responseText}
            onChangeText={setResponseText}
            onSubmit={handleSubmit}
            placeholder="Write your reflection..."
            disabled={!authReady || hasReflectedToday}
            loading={submitMutation.isPending}
            maxLength={reflectionMaxLength}
            maxHeight={200}
          />
          {showNearLimit && (
            <Text
              variant="small"
              color={remainingChars <= 80 ? theme.error : theme.textSecondary}
              style={styles.statusMessage}
            >
              {remainingChars} characters left
            </Text>
          )}
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

        {showCelebration && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
            style={styles.celebrationOverlay}
            pointerEvents="none"
          >
            <Animated.View
              entering={motion.modalPop()}
              style={styles.celebrationModal}
            >
              <Animated.View
                entering={FadeIn.duration(240)}
                style={[styles.celebrationCheck, { backgroundColor: '#E9F8EE' }]}
              >
                <Check size={22} color={theme.success} strokeWidth={2.2} />
              </Animated.View>
              <Text variant="title" center>Noted.</Text>
              <Text variant="small" center color={theme.textSecondary}>
                Tiny steps become streaks.
              </Text>
            </Animated.View>
          </Animated.View>
        )}
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
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  moodStep: {
    flex: 1,
    gap: spacing.xl,
    zIndex: 2,
  },
  moodBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  moodCharacterDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  moodTitle: {
    marginBottom: spacing.sm,
  },
  moodSubtitle: {
    lineHeight: 22,
  },
  stepPill: {
    marginBottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepSegment: {
    width: 36,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  stepSegmentActive: {
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  moodInlineCta: {
    marginTop: spacing.sm,
    zIndex: 2,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
    zIndex: 2,
  },
  reflectFlowerWrap: {
    position: 'absolute',
    right: -320,
    bottom: -320,
    opacity: 0.9,
    zIndex: 1,
  },
  prompt: {
    marginTop: spacing.sm,
  },
  reflectLabel: {
    letterSpacing: 0.4,
  },
  composerContainer: {
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    zIndex: 2,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 246, 235, 0.74)',
    zIndex: 20,
  },
  celebrationModal: {
    width: '86%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  celebrationCheck: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
