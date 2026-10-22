import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, PressScale, ScreenContainer, ScreenHeader, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { MoodFace } from '@/src/components/MoodPicker';
import { useSubmitMood } from '@/src/hooks';

// One colour per rating, low to high: the same ones the app has always used for mood.
const RATINGS = [
  { rating: 1, color: '#FA8A8A', word: 'Low' },
  { rating: 2, color: '#B8BDCC', word: 'Flat' },
  { rating: 3, color: '#98C6FD', word: 'Okay' },
  { rating: 4, color: '#76D8AA', word: 'Good' },
  { rating: 5, color: '#FFDC61', word: 'Great' },
] as const;

export default function CheckInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const mood = useSubmitMood();
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = RATINGS.find((r) => r.rating === picked);

  const save = async () => {
    if (!picked) return;
    try {
      await mood.mutateAsync({ rating: picked });
    } catch {
      // Saved on the device first and sent later, so a failed send never blocks the person.
    }
    router.back();
  };

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader />
      <View style={styles.body}>
        <Text variant="hero">How are you feeling right now?</Text>
        <Text variant="body" color={theme.textTertiary} style={styles.sub}>
          Just a gut answer.
        </Text>

        <View style={styles.row}>
          {RATINGS.map(({ rating, color }) => {
            const active = picked === rating;
            return (
              <PressScale
                key={rating}
                onPress={() => setPicked(rating)}
                accessibilityRole="button"
                accessibilityLabel={`Mood ${rating} of 5`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.face,
                  { backgroundColor: active ? color : theme.surface, borderColor: active ? color : theme.border, transform: [{ scale: active ? 1.12 : 1 }] },
                ]}
              >
                <MoodFace rating={rating} size={34} color={theme.text} />
              </PressScale>
            );
          })}
        </View>
        <Text variant="bodyMedium" medium style={styles.word}>
          {chosen ? chosen.word : ' '}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button title={picked ? 'Done' : 'Skip'} onPress={picked ? save : () => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  face: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  word: { textAlign: 'center', marginTop: spacing.lg },
  footer: { paddingBottom: spacing.xl },
});
