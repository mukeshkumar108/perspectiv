import { ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PressScale, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { formatClock } from './useGameRun';

/**
 * The frame every game sits in. Close on the left (the Expo Go dev button floats top right), the clock in the middle,
 * the score on the right with a small pop whenever it changes, and a thin bar showing how much time is left.
 */
export function GameShell({
  accent,
  score,
  timeLeftMs,
  durationMs,
  showHud = true,
  clockLabel,
  children,
  onClose,
}: {
  accent: string;
  score: number;
  timeLeftMs: number;
  durationMs: number;
  showHud?: boolean;
  /** Replaces the clock text (a trial counter, for games without a time limit). */
  clockLabel?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pop = useSharedValue(1);
  const bar = useSharedValue(1);

  useEffect(() => {
    pop.value = withSequence(withTiming(1.22, { duration: 90 }), withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }));
  }, [score, pop]);
  useEffect(() => {
    bar.value = withTiming(Math.max(0, Math.min(1, timeLeftMs / durationMs)), { duration: 160, easing: Easing.linear });
  }, [timeLeftMs, durationMs, bar]);

  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const low = timeLeftMs < 6000;

  return (
    <ScreenContainer ambient={false} style={styles.screen}>
      {showHud ? (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(120)}>
          <View style={styles.top}>
            <PressScale onPress={onClose ?? (() => router.back())} accessibilityLabel="Close game" style={[styles.close, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <X size={18} color={theme.text} strokeWidth={2.2} />
            </PressScale>
            <Text variant="bodyMedium" medium color={low ? '#D6457B' : theme.text} style={styles.clock}>
              {clockLabel ?? formatClock(timeLeftMs)}
            </Text>
            <Animated.View style={[styles.scoreWrap, scoreStyle]}>
              <Text variant="title">{score}</Text>
            </Animated.View>
          </View>
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.fill, { backgroundColor: accent }, barStyle]} />
          </View>
        </Animated.View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.md },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  clock: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  scoreWrap: { minWidth: 56, alignItems: 'flex-end', marginRight: 52 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  body: { flex: 1, marginTop: spacing.md },
});
