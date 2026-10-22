import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Burst, PrimaryButton, ScreenContainer, ScreenHeader, Text, brand, daypartTint, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { LiveVoiceView } from '@/src/components/LiveVoiceView';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { useDayPlan } from '@/src/hooks';
import { queryKeys } from '@/src/state';
import { VoicePlaybackHost } from '@/src/voice/stream/PlaybackHost';
import { useBeginVoice } from '@/src/voice/useBeginVoice';

const CLOSING: Record<string, { line: string; sub: string }> = {
  morning: { line: 'Go and have it.', sub: 'I would like to hear how it went tonight.' },
  daytime: { line: 'Kept.', sub: 'It will be here when you want it.' },
  evening: { line: 'That was a good one.', sub: 'Sleep well. See you tomorrow.' },
  onboarding: { line: 'That is us introduced.', sub: 'Come back this evening for the first real one.' },
};

/**
 * The everyday way in. The plan chooses the kind of session from the time of day in the person's own timezone;
 * all they do is press the button. (To pick a kind by hand, use the Lab.)
 */
export default function TalkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { plan, greeting } = useDayPlan();
  const { playbackRef, voice, begin, live, errorText, connecting } = useBeginVoice();
  const [finished, setFinished] = useState(false);
  const [burst, setBurst] = useState(0);
  const wasLive = useRef(false);
  const plannedFlow = useRef(plan.flow);
  const accent = sessionAccents[plan.flow === 'daytime' ? 'daytime' : plan.flow];

  // The session is fixed when the screen opens, so the plan changing at 6 pm mid-conversation changes nothing.
  useEffect(() => {
    if (!live && !wasLive.current) plannedFlow.current = plan.flow;
  }, [plan.flow, live]);

  useEffect(() => {
    if (live) {
      wasLive.current = true;
      return;
    }
    if (wasLive.current) {
      wasLive.current = false;
      setFinished(true);
      setBurst((n) => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The card and the streak are written a few seconds after the call ends: look again shortly.
      for (const ms of [6000, 18000, 40000]) {
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.voiceLibrary });
          void queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
        }, ms);
      }
    }
  }, [live, queryClient]);

  const closing = CLOSING[plannedFlow.current] ?? CLOSING.daytime;

  return (
    <ScreenContainer style={styles.container} ambient={false} tint={live || finished ? theme.background : daypartTint[plan.daypart]}>
      <VoicePlaybackHost ref={playbackRef} onState={voice.onPlaybackState} onLevel={voice.onPlaybackLevel} onDiag={voice.onPlaybackDiag} />
      <ScreenHeader
        onBack={() => {
          voice.stop();
          router.back();
        }}
      />

      {live ? (
        <LiveVoiceView voice={voice} />
      ) : finished ? (
        <View style={styles.center}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.closing}>
            <View style={styles.dotWrap}>
              <View style={[styles.dot, { backgroundColor: brand.pink }]} />
              <Burst color={brand.pink} run={burst} spread={110} />
            </View>
            <Text variant="hero" center>
              {closing.line}
            </Text>
            <Text variant="body" center color={theme.textSecondary}>
              {closing.sub}
            </Text>
          </Animated.View>
          <View style={styles.footer}>
            <PrimaryButton title="Back to today" onPress={() => router.replace('/(main)/(tabs)' as any)} />
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Animated.View entering={FadeInUp.duration(420)} style={styles.intro}>
            <Text variant="hero" center>
              {greeting.headline}
            </Text>
            <Text variant="body" center color={theme.textSecondary}>
              {plan.subtitle}
            </Text>
          </Animated.View>
          <View style={styles.orb}>
            <VoiceOrb state="idle" />
          </View>
          {errorText ? (
            <Text variant="small" center color={theme.error} style={styles.error}>
              {errorText}
            </Text>
          ) : null}
          <View style={styles.footer}>
            <PrimaryButton title={connecting ? 'Connecting' : plan.title === 'Talk to Bluum' ? 'Start talking' : `Begin ${plan.title.toLowerCase()}`} variant="pink" loading={connecting} onPress={() => void begin(plannedFlow.current)} />
            <Text variant="caption" center color={theme.textTertiary}>
              Ringer on and volume up. Your voice is measured, never stored.
            </Text>
          </View>
        </View>
      )}
      <View pointerEvents="none" style={[styles.accentLine, { backgroundColor: accent.base }]} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'space-between' },
  intro: { gap: spacing.sm, alignItems: 'center', paddingTop: spacing.lg },
  orb: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { marginBottom: spacing.sm },
  footer: { gap: spacing.md, paddingBottom: spacing.md },
  closing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  dotWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11 },
  accentLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
});
