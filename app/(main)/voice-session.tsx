import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrbVisualizer } from '@/src/components/VoiceOrbVisualizer';
import { useVoiceConnect } from '@/src/hooks';
import type { VoiceConnectFlow } from '@/src/api';
import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { VoicePlaybackHost, type PlaybackHandle } from '@/src/voice/stream/PlaybackHost';
import { useStreamingVoice, type StreamingVoiceStatus } from '@/src/voice/stream/useStreamingVoice';

type FlowOption = { id: VoiceConnectFlow; title: string; subtitle: string };

const FLOW_OPTIONS: FlowOption[] = [
  { id: 'onboarding', title: 'Onboarding', subtitle: 'Collect profile details and setup preferences.' },
  { id: 'first_reflection_day0', title: 'First Reflection Day0', subtitle: 'Run the Day0 first-reflection intro and prompt.' },
  { id: 'first_reflection_core', title: 'Reflection Core', subtitle: 'Run the default core reflection prompt.' },
  { id: 'voice_demo', title: 'Voice Demo', subtitle: 'Run the demo conversation.' },
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
  connecting: 'thinking',
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
          ) : null}
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
          <Text variant="small" color={theme.textSecondary}>
            Ringer on and volume up, so you can hear her.
          </Text>
          <Button title="Test sound" variant="ghost" onPress={() => void voice.testSound()} />
          <View style={styles.linkRow}>
            <Button title="What I was grateful for" variant="ghost" onPress={() => router.push('/(main)/library' as any)} />
            <Button title="Session research" variant="ghost" onPress={() => router.push('/(main)/research' as any)} />
          </View>
          {FLOW_OPTIONS.map((option) => (
            <Card key={option.id} style={[styles.flowCard, { borderColor: theme.border, borderWidth: 1 }]}>
              <Text variant="bodyMedium">{option.title}</Text>
              <Text variant="small" color={theme.textSecondary} style={styles.flowSubtitle}>
                {option.subtitle}
              </Text>
              <View style={styles.flowAction}>
                <Button
                  title="Start"
                  variant="secondary"
                  onPress={() => void begin(option.id)}
                  disabled={connect.isPending}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.live}>
          <Pressable style={styles.orbWrap} onPress={voice.interrupt} accessibilityLabel="Orb">
            <VoiceOrbVisualizer state={ORB_STATE[voice.status]} levelRef={voice.levelRef} />
          </Pressable>
          <View style={styles.statusSlot}>
            <Text variant="bodyMedium" style={styles.statusLabel}>
              {STATUS_LABEL[voice.status]}
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
          <Button title="End" variant="ghost" onPress={voice.stop} />
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
  flowCard: {},
  flowSubtitle: { marginTop: spacing.xs },
  flowAction: { marginTop: spacing.sm, alignItems: 'flex-start' },
  live: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.lg },
  orbWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // A fixed slot, so the label changing never moves anything else.
  statusSlot: { height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statusLabel: { textAlign: 'center' },
  transcript: { alignSelf: 'stretch', height: 150, marginBottom: spacing.sm },
  transcriptContent: { gap: spacing.xs, paddingHorizontal: spacing.md },
  line: { textAlign: 'center' },
});
