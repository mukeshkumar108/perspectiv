import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, FadeIn } from 'react-native-reanimated';
import { AudioLines, Moon, ShieldCheck, Sunrise, MessageCircle, TrendingUp } from 'lucide-react-native';

import { Overline, Pill, PressScale, PrimaryButton, ScreenContainer, Text, TextInput, brand, daypartTint, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { markOnboardingDone, useUpdateProfile } from '@/src/hooks';
import { VoicePlaybackHost, type PlaybackHandle } from '@/src/voice/stream/PlaybackHost';
import { useStreamingVoice } from '@/src/voice/stream/useStreamingVoice';
import { useRef } from 'react';

const STEPS = 5;
const PRONOUNS = ['she/her', 'he/him', 'they/them'];

function Row({ Icon, title, body, accent }: { Icon: typeof Moon; title: string; body: string; accent: { base: string; soft: string } }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: accent.soft }]}>
      <View style={[styles.disc, { backgroundColor: accent.base }]}>
        <Icon size={20} color={theme.text} strokeWidth={1.8} />
      </View>
      <View style={styles.rowText}>
        <Text variant="bodyMedium" medium>
          {title}
        </Text>
        <Text variant="small" color={theme.textSecondary}>
          {body}
        </Text>
      </View>
    </View>
  );
}

/** The first run: what this is, how a day goes, why it is worth trusting, a name, a sound check, and then the first conversation. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const update = useUpdateProfile();
  const playbackRef = useRef<PlaybackHandle>(null);
  const voice = useStreamingVoice(playbackRef);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState<string | null>(null);
  const [soundTested, setSoundTested] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const saveName = () => {
    update.mutate({ displayName: name.trim(), pronouns }, { onSuccess: next });
  };

  const finish = async () => {
    await markOnboardingDone();
    router.replace('/(main)/talk' as any);
  };
  const skip = async () => {
    await markOnboardingDone();
    router.replace('/(main)/(tabs)' as any);
  };

  const tint = [daypartTint.evening, daypartTint.morning, daypartTint.day, daypartTint.evening, daypartTint.morning][step];

  return (
    <ScreenContainer ambient={false} tint={tint} style={styles.screen}>
      <VoicePlaybackHost ref={playbackRef} onState={voice.onPlaybackState} onLevel={voice.onPlaybackLevel} onDiag={voice.onPlaybackDiag} />

      <View style={styles.dots}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? brand.pink : theme.border, width: i === step ? 26 : 8 }]} />
        ))}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View key={step} entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(160)} style={styles.flex}>
          {step === 0 ? (
            <View style={styles.center}>
              <VoiceOrb state="idle" />
              <Text variant="hero" center>
                Bluum
              </Text>
              <Text variant="body" center color={theme.textSecondary} style={styles.lede}>
                A few minutes of talking a day, to catch the good you would normally rush past.
              </Text>
            </View>
          ) : null}

          {step === 1 ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text variant="hero">A day with Bluum</Text>
              <Text variant="body" color={theme.textSecondary}>
                It is a conversation, not a form. You talk, she listens and keeps what matters.
              </Text>
              <View style={styles.rows}>
                <Row Icon={Sunrise} title="Morning" body="What are you looking forward to? Takes a minute." accent={sessionAccents.morning} />
                <Row Icon={MessageCircle} title="Any time" body="Something happened? Catch it before it slips away." accent={sessionAccents.daytime} />
                <Row Icon={Moon} title="Evening, from 6 pm" body="Find one good moment from today and go back into it." accent={sessionAccents.evening} />
              </View>
            </ScrollView>
          ) : null}

          {step === 2 ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text variant="hero">Built on real research</Text>
              <Text variant="body" color={theme.textSecondary}>
                We are open about what this is, and what we are still finding out.
              </Text>
              <View style={styles.rows}>
                <Row Icon={AudioLines} title="Noticing the good" body="Studies of gratitude and savouring suggest that going back into a good moment, not just listing it, is what helps." accent={sessionAccents.evening} />
                <Row Icon={TrendingUp} title="Your own baseline" body="We look at how your voice and words change against your own past, over weeks. Never against anyone else." accent={sessionAccents.daytime} />
                <Row Icon={ShieldCheck} title="Private by design" body="Your voice is measured as it is spoken and never stored. Bluum is a wellbeing tool, not a medical device." accent={sessionAccents.ten_things} />
              </View>
            </ScrollView>
          ) : null}

          {step === 3 ? (
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text variant="hero">What should we call you?</Text>
              <Text variant="body" color={theme.textSecondary}>
                Just a first name is perfect.
              </Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" autoCorrect={false} maxLength={50} style={styles.input} />
              <View style={styles.pronouns}>
                <Overline>Pronouns, if you like</Overline>
                <View style={styles.chips}>
                  {PRONOUNS.map((p) => (
                    <Pill key={p} label={p} active={pronouns === p} onPress={() => setPronouns(pronouns === p ? null : p)} />
                  ))}
                </View>
              </View>
              {update.error ? (
                <Text variant="small" color={theme.error}>
                  That did not go through. Try again.
                </Text>
              ) : null}
            </ScrollView>
          ) : null}

          {step === 4 ? (
            <View style={styles.center}>
              <Animated.View entering={FadeIn.delay(100)}>
                <VoiceOrb state={soundTested ? 'speaking' : 'idle'} />
              </Animated.View>
              <Text variant="hero" center>
                {name.trim() ? `Ready, ${name.trim()}?` : 'Ready?'}
              </Text>
              <Text variant="body" center color={theme.textSecondary} style={styles.lede}>
                Bluum listens through your microphone and talks back. Turn the ringer on and the volume up, then say hello.
              </Text>
              <PressScale
                onPress={() => {
                  void voice.testSound();
                  setSoundTested(true);
                }}
                style={[styles.testSound, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text variant="small" medium>
                  {soundTested ? 'Heard it? Play again' : 'Test the sound'}
                </Text>
              </PressScale>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {step === 3 ? (
          <PrimaryButton title="Continue" arrow disabled={name.trim().length === 0} loading={update.isPending} onPress={saveName} />
        ) : step === STEPS - 1 ? (
          <PrimaryButton title="Start my first conversation" variant="pink" onPress={finish} />
        ) : (
          <PrimaryButton title={step === 0 ? 'Get started' : 'Continue'} arrow onPress={next} />
        )}
        <View style={styles.foot}>
          {step > 0 && step !== 3 ? (
            <PressScale onPress={back} style={styles.link}>
              <Text variant="small" color={theme.textSecondary}>
                Back
              </Text>
            </PressScale>
          ) : null}
          {step === 0 ? (
            <PressScale onPress={skip} style={styles.link}>
              <Text variant="small" color={theme.textTertiary}>
                Skip for now
              </Text>
            </PressScale>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  lede: { paddingHorizontal: spacing.md },
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  rows: { gap: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: 24, padding: spacing.md + 2 },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  input: { minHeight: 58, textAlignVertical: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  pronouns: { gap: spacing.sm, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  testSound: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md - 2, marginTop: spacing.sm },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
  foot: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  link: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
});
