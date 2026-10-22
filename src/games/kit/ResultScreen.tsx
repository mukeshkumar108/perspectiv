import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trophy } from 'lucide-react-native';

import { Burst, CountUp, Overline, PrimaryButton, ScreenContainer, Text, brand, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

export type ResultStat = { label: string; value: string };

/** Where every game ends: the score arrives, a new best gets a badge and a burst, then the numbers behind it. */
export function ResultScreen({
  title,
  accent,
  score,
  previousBest,
  stats,
  onAgain,
}: {
  title: string;
  accent: { base: string; soft: string };
  score: number;
  /** The best score before this run, or null when there is none. */
  previousBest: number | null;
  stats: ResultStat[];
  onAgain: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [burst, setBurst] = useState(0);
  const isBest = previousBest === null ? score > 0 : score > previousBest;

  useEffect(() => {
    const id = setTimeout(() => {
      setBurst(1);
      void Haptics.notificationAsync(isBest ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    }, 700);
    return () => clearTimeout(id);
  }, [isBest]);

  return (
    <ScreenContainer ambient={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(420)} style={[styles.hero, { backgroundColor: accent.soft }]}>
          <View style={[styles.glow, { backgroundColor: accent.base }]} />
          <Burst color={isBest ? brand.accent : accent.base} run={burst} spread={130} />
          <Overline color={theme.textSecondary}>{title}</Overline>
          <CountUp to={score} style={styles.score} />
          {isBest ? (
            <View style={[styles.badge, { backgroundColor: brand.accent }]}>
              <Trophy size={14} color={theme.text} strokeWidth={2} />
              <Text variant="small" medium>
                New best
              </Text>
            </View>
          ) : previousBest !== null ? (
            <Text variant="small" color={theme.textSecondary}>
              Your best is {previousBest}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(380)} style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.stat, { backgroundColor: theme.surface }]}>
              <Overline>{s.label}</Overline>
              <Text variant="title">{s.value}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Play again" arrow onPress={onAgain} />
        <PrimaryButton title="Back to games" variant="outline" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  hero: { borderRadius: 28, padding: 24, gap: spacing.sm, alignItems: 'flex-start', overflow: 'hidden', minHeight: 210, justifyContent: 'center' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -90, opacity: 0.4 },
  score: { fontSize: 56, lineHeight: 62 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: '47%', borderRadius: 22, padding: spacing.md, gap: 4 },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
});
