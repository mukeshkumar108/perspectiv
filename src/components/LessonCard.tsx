import { StyleSheet, View } from 'react-native';
import { Play } from 'lucide-react-native';

import { Overline, PressScale, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

type Accent = { base: string; soft: string };

/**
 * A lesson as a small poster: its number and length at the top, the title large, a line of what it covers,
 * and a play button at the bottom. A soft circle of the accent colour sits behind the corner for depth.
 */
export function LessonCard({
  index,
  title,
  description,
  minutes,
  accent,
  onPress,
}: {
  index: number;
  title: string;
  description?: string;
  minutes?: number | null;
  accent: Accent;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Play ${title}`} style={[styles.card, { backgroundColor: accent.soft }]}>
      <View style={[styles.glow, { backgroundColor: accent.base }]} />
      <View style={styles.top}>
        <Overline color={theme.textSecondary}>{`Lesson ${String(index + 1).padStart(2, '0')}`}</Overline>
        {minutes ? (
          <Text variant="caption" color={theme.textSecondary}>
            {minutes} min
          </Text>
        ) : null}
      </View>

      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="small" color={theme.textSecondary} numberOfLines={3}>
          {description}
        </Text>
      ) : null}

      <View style={styles.bottom}>
        <View style={[styles.play, { backgroundColor: theme.text }]}>
          <Play size={16} color={theme.background} fill={theme.background} strokeWidth={0} style={styles.playIcon} />
        </View>
        <Text variant="small" medium>
          Listen
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, padding: spacing.lg, gap: spacing.sm, overflow: 'hidden' },
  glow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -60, top: -70, opacity: 0.45 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: spacing.xs, maxWidth: '88%' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
});
