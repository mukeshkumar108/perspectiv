import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { useProfile, useVoiceConnect } from '@/src/hooks';
import type { VoiceConnectFlow } from '@/src/api';
import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { VoicePlaybackHost, type PlaybackHandle } from '@/src/voice/stream/PlaybackHost';
import { useStreamingVoice, type StreamingVoiceStatus } from '@/src/voice/stream/useStreamingVoice';

type FlowOption = { id: VoiceConnectFlow; title: string; subtitle: string };

const FLOW_OPTIONS: FlowOption[] = [
  { id: 'morning', title: 'Morning', subtitle: 'First session of the day: what are you looking forward to?' },
  { id: 'daytime', title: 'Drop-in', subtitle: 'A quick one during the day: something happen, something to catch?' },
  { id: 'evening', title: 'Evening reflection', subtitle: 'The main practice: one good moment from today.' },
  { id: 'ten_things', title: 'Ten things about you', subtitle: 'Different today: things you actually like about yourself.' },
  { id: 'onboarding', title: 'Welcome', subtitle: 'First conversation: what Bluum is and what brought you here.' },
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

      <View style={styles.header}>
        <Pressable
          onPress={() => {
            voice.stop();
            router.back();
          }}
          hitSlop={16}
        >
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
        <Text variant="bodyMedium">Voice Session</Text>
        <View style={styles.headerAction}>
          {live ? (
            <Pressable onPress={() => setShowText((on) => !on)} hitSlop={12} accessibilityLabel="Show or hide text">
              <Text variant="small" color={theme.textSecondary}>
                {showText ? 'Hide text' : 'Show text'}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/(main)/you' as any)} hitSlop={12} accessibilityLabel="About you">
              <Text variant="small" color={theme.textSecondary}>
                About you
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {errorText ? (
        <Card style={styles.errorCard} variant="subtle">
          <Text variant="small" color={theme.textSecondary}>
            {errorText}
          </Text>
        </Card>
      ) : null}

      {!live ? (
        <ScrollView contentContainerStyle={styles.flowPicker} showsVerticalScrollIndicator={false}>
          {needsName ? (
            <Pressable
              onPress={() => router.push('/(main)/you' as any)}
              accessibilityRole="button"
              style={[styles.nameCard, { backgroundColor: theme.text }]}
            >
              <Text variant="bodyMedium" color={theme.background}>
                What should we call you?
              </Text>
              <Text variant="small" color={theme.background} style={styles.nameCardSub}>
                A name helps. Tell Bluum a bit about you.
              </Text>
            </Pressable>
          ) : null}
          <Text variant="hero" style={styles.pickTitle}>
            Talk to Bluum
          </Text>
          <Text variant="body" color={theme.textTertiary} style={styles.pickSub}>
            Pick a session. Ringer on and volume up, so you can hear her.
          </Text>
          <Button title="Test sound" variant="ghost" onPress={() => void voice.testSound()} />
          <View style={styles.linkRow}>
            <Button title="My moments" variant="ghost" onPress={() => router.push('/(main)/library' as any)} />
            <Button title="Session research" variant="ghost" onPress={() => router.push('/(main)/research' as any)} />
          </View>
          {FLOW_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => void begin(option.id)}
              disabled={connect.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Start ${option.title}`}
              style={({ pressed }) => [
                styles.flowCard,
                { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed || connect.isPending ? 0.7 : 1 },
              ]}
            >
              <View style={styles.flowText}>
                <Text variant="bodyMedium">{option.title}</Text>
                <Text variant="small" color={theme.textTertiary} style={styles.flowSubtitle}>
                  {option.subtitle}
                </Text>
              </View>
              <ArrowRight size={18} color={theme.textTertiary} strokeWidth={1.8} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.live}>
          <Pressable style={styles.orbWrap} onPress={voice.interrupt} accessibilityLabel="Orb">
            <VoiceOrb state={ORB_STATE[voice.status]} levelRef={voice.levelRef} />
          </Pressable>
          <View style={styles.statusSlot}>
            <Text variant="small" color={theme.textTertiary} style={styles.statusLabel}>
              {STATUS_LABEL[voice.status].toUpperCase()}
            </Text>
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
          <Pressable onPress={voice.stop} accessibilityRole="button" style={[styles.endPill, { borderColor: theme.border }]}>
            <Text variant="small" color={theme.textSecondary}>
              End session
            </Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  headerAction: { minWidth: 76, alignItems: 'flex-end' },
  errorCard: { marginBottom: spacing.md },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  flowPicker: { gap: spacing.sm, paddingBottom: spacing.lg },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  flowText: { flex: 1 },
  pickTitle: { marginTop: spacing.sm },
  nameCard: { borderRadius: 20, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: 2 },
  nameCardSub: { opacity: 0.75 },
  pickSub: { marginBottom: spacing.sm },
  endPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  flowSubtitle: { marginTop: spacing.xs },
  flowAction: { marginTop: spacing.sm, alignItems: 'flex-start' },
  live: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.lg },
  orbWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // A fixed slot, so the label changing never moves anything else.
  statusSlot: { height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statusLabel: { textAlign: 'center', letterSpacing: 2.4 },
  transcript: { alignSelf: 'stretch', height: 150, marginBottom: spacing.sm },
  transcriptContent: { gap: spacing.xs, paddingHorizontal: spacing.md },
  line: { textAlign: 'center' },
});
