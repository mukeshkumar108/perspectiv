import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Moon, Sparkles, Sunrise } from 'lucide-react-native';

import { AccentCard, Overline, PressScale, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import type { SessionKind } from '@/src/ui/tokens';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { useProfile, useVoiceConnect } from '@/src/hooks';
import type { VoiceConnectFlow } from '@/src/api';
import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { VoicePlaybackHost, type PlaybackHandle } from '@/src/voice/stream/PlaybackHost';
import { useStreamingVoice, type StreamingVoiceStatus } from '@/src/voice/stream/useStreamingVoice';

type FlowOption = { id: VoiceConnectFlow & SessionKind; title: string; subtitle: string; Icon: typeof Moon };

const FLOW_OPTIONS: FlowOption[] = [
  { id: 'morning', title: 'Morning', subtitle: 'What are you looking forward to today?', Icon: Sunrise },
  { id: 'daytime', title: 'Drop-in', subtitle: 'Something happen? Catch it before it goes.', Icon: MessageCircle },
  { id: 'evening', title: 'Evening reflection', subtitle: 'One good moment from today.', Icon: Moon },
  { id: 'ten_things', title: 'Ten things about you', subtitle: 'Things you actually like about yourself.', Icon: Heart },
  { id: 'onboarding', title: 'Welcome', subtitle: 'What Bluum is, and what brought you here.', Icon: Sparkles },
];

const STATUS_LABEL: Record<StreamingVoiceStatus, string> = {
  idle: '',
  connecting: 'Connecting',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: '',
};

const ORB_STATE: Record<StreamingVoiceStatus, VoiceOrbState> = {
  idle: 'idle',
  connecting: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  error: 'idle',
};

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export default function VoiceSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const playbackRef = useRef<PlaybackHandle>(null);
  const connect = useVoiceConnect();
  const profile = useProfile();
  const needsName = profile.isSuccess && !profile.data.profile.displayName?.trim();
  const voice = useStreamingVoice(playbackRef);

  const live = voice.status !== 'idle' && voice.status !== 'error';
  // Off by default: her replies vary from a line to a paragraph, and showing them makes the screen jump.
  const [showText, setShowText] = useState(false);

  const begin = useCallback(
    async (flow: VoiceConnectFlow) => {
      try {
        const info = await connect.mutateAsync({ flow, timezone: deviceTimezone() });
        const url = `${info.voiceUrl}${info.voiceUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(info.token)}`;
        await voice.start({
          url,
          instructions: info.instructions,
          voice: info.voice,
          opener: info.opener,
        });
      } catch {
        // connect errors are shown through connect.error below
      }
    },
    [connect, voice],
  );

  const errorText = voice.error ?? (connect.error ? connect.error.message : null);

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <VoicePlaybackHost
        ref={playbackRef}
        onState={voice.onPlaybackState}
        onLevel={voice.onPlaybackLevel}
        onDiag={voice.onPlaybackDiag}
      />

      <ScreenHeader
        onBack={() => {
          voice.stop();
          router.back();
        }}
        right={
          live ? (
            <Pressable onPress={() => setShowText((on) => !on)} hitSlop={12} accessibilityLabel="Show or hide text">
              <Text variant="small" color={theme.textSecondary}>
                {showText ? 'Hide text' : 'Show text'}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {errorText ? (
        <View style={[styles.error, { backgroundColor: theme.errorLight }]}>
          <Text variant="small" color={theme.error}>
            {errorText}
          </Text>
        </View>
      ) : null}

      {!live ? (
        <ScrollView contentContainerStyle={styles.picker} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text variant="hero">Talk to Bluum</Text>
            <Text variant="body" color={theme.textTertiary}>
              Pick a session. Ringer on and volume up.
            </Text>
          </View>

          {needsName ? (
            <PressScale onPress={() => router.push('/(main)/you' as any)} style={[styles.nameCard, { backgroundColor: theme.text }]}>
              <Text variant="bodyMedium" medium color={theme.background}>
                What should we call you?
              </Text>
              <Text variant="small" color={theme.background} style={styles.dim}>
                A name helps. Tell Bluum a bit about you.
              </Text>
            </PressScale>
          ) : null}

          <View style={styles.list}>
            {FLOW_OPTIONS.map(({ id, title, subtitle, Icon }) => (
              <AccentCard
                key={id}
                title={title}
                subtitle={subtitle}
                accent={sessionAccents[id]}
                icon={<Icon size={20} color={theme.text} strokeWidth={1.8} />}
                disabled={connect.isPending}
                onPress={() => void begin(id)}
              />
            ))}
          </View>

          <View style={styles.links}>
            <Pressable onPress={() => router.push('/(main)/library' as any)} hitSlop={10}>
              <Overline>My moments</Overline>
            </Pressable>
            <Pressable onPress={() => router.push('/(main)/you' as any)} hitSlop={10}>
              <Overline>About you</Overline>
            </Pressable>
            <Pressable onPress={() => router.push('/(main)/research' as any)} hitSlop={10}>
              <Overline>Research</Overline>
            </Pressable>
            <Pressable onPress={() => void voice.testSound()} hitSlop={10}>
              <Overline>Test sound</Overline>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.live}>
          <Pressable style={styles.orbWrap} onPress={voice.interrupt} accessibilityLabel="Orb">
            <VoiceOrb state={ORB_STATE[voice.status]} levelRef={voice.levelRef} />
          </Pressable>
          <View style={styles.statusSlot}>
            <Overline>{STATUS_LABEL[voice.status]}</Overline>
          </View>
          {showText ? (
            <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
              {voice.userText ? (
                <Text variant="small" color={theme.textSecondary} style={styles.line}>
                  {voice.userText}
                </Text>
              ) : null}
              {voice.assistantText ? (
                <Text variant="body" style={styles.line}>
                  {voice.assistantText}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
          <PressScale onPress={voice.stop} style={[styles.endPill, { borderColor: theme.border }]}>
            <Text variant="small" color={theme.textSecondary}>
              End session
            </Text>
          </PressScale>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  error: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  picker: { gap: spacing.lg, paddingBottom: spacing.xl },
  titleBlock: { gap: spacing.xs, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  nameCard: { borderRadius: 20, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: 2 },
  dim: { opacity: 0.75 },
  live: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.lg },
  orbWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // A fixed slot, so the label changing never moves anything else.
  statusSlot: { height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  transcript: { alignSelf: 'stretch', height: 150, marginBottom: spacing.sm },
  transcriptContent: { gap: spacing.xs, paddingHorizontal: spacing.md },
  line: { textAlign: 'center' },
  endPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
});
