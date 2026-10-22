import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Burst, PressScale, PrimaryButton, ScreenContainer, ScreenHeader, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { MoodFace } from '@/src/components/MoodPicker';
import { useSubmitMood } from '@/src/hooks';

// One colour per rating, low to high: the same ones the app has always used for mood.
const RATINGS = [
  { rating: 1, color: '#FA8A8A', word: 'Low', line: 'Today is a low one, and that is allowed.' },
  { rating: 2, color: '#B8BDCC', word: 'Flat', line: 'A flat day. Nothing to fix about it.' },
  { rating: 3, color: '#98C6FD', word: 'Okay', line: 'Steady. A fine place to be.' },
  { rating: 4, color: '#76D8AA', word: 'Good', line: 'A good one. Worth noticing.' },
  { rating: 5, color: '#FFDC61', word: 'Great', line: 'A great one. Hold onto it.' },
] as const;

export default function CheckInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const mood = useSubmitMood();
  const [picked, setPicked] = useState<number | null>(null);
  const [pickBurst, setPickBurst] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealBurst, setRevealBurst] = useState(0);
  const wash = useSharedValue(0);
  const chosen = RATINGS.find((r) => r.rating === picked);

  const diag = Math.sqrt(width * width + height * height);
  const washStyle = useAnimatedStyle(() => ({ transform: [{ scale: wash.value }], opacity: wash.value > 0 ? 1 : 0 }));

  const pick = (rating: number) => {
    setPicked(rating);
    setPickBurst((n) => n + 1);
  };

  const save = async () => {
    if (!picked || !chosen) return;
    setRevealed(true);
    wash.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
    setTimeout(() => {
      setRevealBurst((n) => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 420);
    try {
      await mood.mutateAsync({ rating: picked });
    } catch {
      // Saved on the device first and sent later, so a failed send never blocks the person.
    }
    setTimeout(() => router.back(), 2100);
  };

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader />
      <View style={styles.body}>
        <Text variant="hero">How are you feeling right now?</Text>
        <Text variant="body" color={theme.textTertiary} style={styles.sub}>
          Just a gut answer.
        </Text>

        <View style={styles.faces}>
          <View style={styles.row}>
            {RATINGS.map(({ rating, color }) => {
              const active = picked === rating;
              return (
                <PressScale
                  key={rating}
                  onPress={() => pick(rating)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mood ${rating} of 5`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.face,
                    { backgroundColor: active ? color : theme.surface, borderColor: active ? color : theme.border, transform: [{ scale: active ? 1.14 : 1 }] },
                  ]}
                >
                  <MoodFace rating={rating} size={34} color={theme.text} />
                </PressScale>
              );
            })}
          </View>
          {chosen ? <Burst color={chosen.color} run={pickBurst} spread={70} /> : null}
        </View>

        <View style={styles.wordSlot}>
          {chosen ? (
            <Animated.View key={chosen.rating} entering={FadeIn.duration(220)}>
              <Text variant="title" style={styles.word}>
                {chosen.word}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title={picked ? 'Done' : 'Skip'} variant={picked ? 'solid' : 'outline'} onPress={picked ? save : () => router.back()} />
      </View>

      {revealed && chosen ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <Animated.View style={[styles.wash, { backgroundColor: chosen.color, width: diag * 2, height: diag * 2, borderRadius: diag, left: width / 2 - diag, top: height * 0.62 - diag }, washStyle]} />
          <Animated.View entering={FadeIn.delay(380).duration(380)} style={styles.reveal}>
            <View style={styles.bigFace}>
              <MoodFace rating={chosen.rating} size={96} color={theme.text} />
              <Burst color={theme.text} run={revealBurst} spread={130} />
            </View>
            <Text variant="hero" center style={styles.revealWord}>
              {chosen.word}
            </Text>
            <Text variant="body" center color={theme.text} style={styles.revealLine}>
              {chosen.line}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xxl },
  faces: { position: 'relative' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  face: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wordSlot: { height: 44, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  word: { textAlign: 'center' },
  footer: { paddingBottom: spacing.md },
  wash: { position: 'absolute' },
  reveal: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  bigFace: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  revealWord: { marginTop: spacing.sm },
  revealLine: { opacity: 0.8 },
});
