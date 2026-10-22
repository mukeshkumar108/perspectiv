import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Overline, PressScale, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import type { StreamingVoiceStatus, useStreamingVoice } from '@/src/voice/stream/useStreamingVoice';

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

/** The conversation itself: the orb, one quiet word for what is happening, optional text, and a way to end. */
export function LiveVoiceView({ voice }: { voice: ReturnType<typeof useStreamingVoice> }) {
  const theme = useTheme();
  // Off by default: her replies vary from a line to a paragraph, and showing them makes the screen jump.
  const [showText, setShowText] = useState(false);

  return (
    <View style={styles.live}>
      <Pressable style={styles.textToggle} onPress={() => setShowText((on) => !on)} hitSlop={12} accessibilityLabel="Show or hide text">
        <Text variant="small" color={theme.textSecondary}>
          {showText ? 'Hide text' : 'Show text'}
        </Text>
      </Pressable>
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
  );
}

const styles = StyleSheet.create({
  live: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.lg },
  textToggle: { alignSelf: 'flex-end', marginRight: 56 },
  orbWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // A fixed slot, so the label changing never moves anything else.
  statusSlot: { height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  transcript: { alignSelf: 'stretch', height: 150, marginBottom: spacing.sm },
  transcriptContent: { gap: spacing.xs, paddingHorizontal: spacing.md },
  line: { textAlign: 'center' },
  endPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
});
