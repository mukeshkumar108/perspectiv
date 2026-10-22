import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';

import { Overline, PressScale, ScreenContainer, ScreenHeader, Text, Waveform, brand, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { formatMs, useAudioPlayback } from '@/src/audio/useAudioPlayback';

type Accent = { base: string; soft: string };

/**
 * One audio screen for lessons and guided sessions: the orb breathes while it plays, an accent-coloured scrubber, skip and a large play button.
 * Everything that plays audio in the app goes through this, so they look and behave the same.
 */
export function AudioPlayerScreen({
  overline,
  title,
  description,
  source,
  fallbackDurationMs,
  accent,
}: {
  overline: string;
  title: string;
  description?: string;
  source: { uri: string } | number | null;
  fallbackDurationMs: number;
  accent: Accent;
}) {
  const theme = useTheme();
  const { isPlaying, positionMs, durationMs, failed, toggle, seekBy } = useAudioPlayback(source, fallbackDurationMs);
  const progress = useSharedValue(0);
  const ratio = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 160, easing: Easing.out(Easing.quad) });
  }, [ratio, progress]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader />

      <Animated.View entering={motion.itemEnter(60, 'up')} style={styles.heading}>
        <Overline color={theme.textTertiary}>{overline}</Overline>
        <Text variant="title">{title}</Text>
        {description ? (
          <Text variant="small" color={theme.textSecondary} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={motion.itemEnter(140, 'up')} style={styles.stage}>
        <View style={[styles.halo, { backgroundColor: accent.soft }]} />
        <VoiceOrb state={isPlaying ? 'speaking' : 'idle'} />
      </Animated.View>

      <Animated.View entering={motion.itemEnter(220, 'up')} style={styles.player}>
        {failed ? (
          <Text variant="small" color={theme.error}>
            The audio would not load. Check your connection and try again.
          </Text>
        ) : null}
        <Waveform seed={title} progress={ratio} height={44} count={44} activeColor={brand.accent} />
        <View style={styles.timeRow}>
          <Text variant="caption" color={theme.textTertiary}>
            {formatMs(positionMs)}
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            {`-${formatMs(Math.max(0, durationMs - positionMs))}`}
          </Text>
        </View>

        <View style={styles.controls}>
          <PressScale onPress={() => seekBy(-15000)} accessibilityLabel="Back 15 seconds" style={styles.skip}>
            <SkipBack size={22} color={theme.text} strokeWidth={1.9} />
            <Text variant="caption" color={theme.textSecondary}>
              15
            </Text>
          </PressScale>
          <PressScale onPress={toggle} disabled={!source} accessibilityLabel={isPlaying ? 'Pause' : 'Play'} scaleTo={0.93} style={[styles.play, { backgroundColor: brand.accent }]}>
            {isPlaying ? <Pause size={28} color={theme.text} strokeWidth={2.2} /> : <Play size={28} color={theme.text} fill={theme.text} strokeWidth={0} style={styles.playIcon} />}
          </PressScale>
          <PressScale onPress={() => seekBy(15000)} accessibilityLabel="Forward 15 seconds" style={styles.skip}>
            <SkipForward size={22} color={theme.text} strokeWidth={1.9} />
            <Text variant="caption" color={theme.textSecondary}>
              15
            </Text>
          </PressScale>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { gap: spacing.sm },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, opacity: 0.9 },
  player: { gap: spacing.md, paddingBottom: spacing.lg },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', transformOrigin: 'left' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.xs },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  skip: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', gap: 1 },
  play: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 3 },
});
