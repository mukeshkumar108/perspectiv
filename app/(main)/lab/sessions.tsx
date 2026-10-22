import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Moon, Sparkles, Sunrise } from 'lucide-react-native';

import { AccentCard, Overline, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import type { SessionKind } from '@/src/ui/tokens';
import { useTheme } from '@/src/ui/useTheme';
import { LiveVoiceView } from '@/src/components/LiveVoiceView';
import type { VoiceConnectFlow } from '@/src/api';
import { VoicePlaybackHost } from '@/src/voice/stream/PlaybackHost';
import { useBeginVoice } from '@/src/voice/useBeginVoice';

type FlowOption = { id: VoiceConnectFlow & SessionKind; title: string; subtitle: string; Icon: typeof Moon };

const FLOW_OPTIONS: FlowOption[] = [
  { id: 'morning', title: 'Morning', subtitle: 'What are you looking forward to today?', Icon: Sunrise },
  { id: 'daytime', title: 'Drop-in', subtitle: 'Something happen? Catch it before it goes.', Icon: MessageCircle },
  { id: 'evening', title: 'Evening reflection', subtitle: 'One good moment from today.', Icon: Moon },
  { id: 'ten_things', title: 'Ten things about you', subtitle: 'Things you actually like about yourself.', Icon: Heart },
  { id: 'onboarding', title: 'Welcome', subtitle: 'What Bluum is, and what brought you here.', Icon: Sparkles },
];

/** The Lab: start any kind of session on demand, whatever the time. For testing, not for everyday use. */
export default function LabSessionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { playbackRef, voice, begin, live, errorText, connecting } = useBeginVoice();

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <VoicePlaybackHost ref={playbackRef} onState={voice.onPlaybackState} onLevel={voice.onPlaybackLevel} onDiag={voice.onPlaybackDiag} />
      <ScreenHeader
        title="Lab · sessions"
        onBack={() => {
          voice.stop();
          router.back();
        }}
      />

      {errorText ? (
        <View style={[styles.error, { backgroundColor: theme.errorLight }]}>
          <Text variant="small" color={theme.error}>
            {errorText}
          </Text>
        </View>
      ) : null}

      {live ? (
        <LiveVoiceView voice={voice} />
      ) : (
        <ScrollView contentContainerStyle={styles.picker} showsVerticalScrollIndicator={false}>
          <Text variant="body" color={theme.textTertiary}>
            Start any session, at any time. Ringer on and volume up.
          </Text>
          <View style={styles.list}>
            {FLOW_OPTIONS.map(({ id, title, subtitle, Icon }) => (
              <AccentCard key={id} title={title} subtitle={subtitle} accent={sessionAccents[id]} icon={<Icon size={20} color={theme.text} strokeWidth={1.8} />} disabled={connecting} onPress={() => void begin(id)} />
            ))}
          </View>
          <View style={styles.links}>
            <Overline onPress={() => router.push('/(main)/research' as any)}>Research</Overline>
            <Overline onPress={() => void voice.testSound()}>Test sound</Overline>
            <Overline onPress={() => router.push('/(main)/debug' as any)}>Debug</Overline>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  error: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  picker: { gap: spacing.lg, paddingBottom: spacing.xl },
  list: { gap: spacing.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
