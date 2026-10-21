import { useCallback, useRef } from 'react';
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
        <View style={styles.headerSpacer} />
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
          <Text variant="bodyMedium" style={styles.statusLabel}>
            {STATUS_LABEL[voice.status]}
          </Text>
          <View style={styles.transcript}>
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
          </View>
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
  headerSpacer: { width: 22 },
  errorCard: { marginBottom: spacing.md },
  flowPicker: { gap: spacing.sm, paddingBottom: spacing.lg },
  flowCard: {},
  flowSubtitle: { marginTop: spacing.xs },
  flowAction: { marginTop: spacing.sm, alignItems: 'flex-start' },
  live: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.lg },
  orbWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  statusLabel: { marginBottom: spacing.sm },
  transcript: { alignSelf: 'stretch', minHeight: 96, gap: spacing.xs, paddingHorizontal: spacing.md },
  line: { textAlign: 'center' },
});
