import { StyleSheet, View } from 'react-native';

import { Overline, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import type { VoiceCard } from '@/src/api/schemas';

/** What each kind of card is called, and the colour it wears. A moment is the default. */
const KIND: Record<string, { label: string; accent: { base: string; soft: string } }> = {
  moment: { label: 'A good moment', accent: sessionAccents.evening },
  intention: { label: 'Looking forward to', accent: sessionAccents.morning },
  self: { label: 'About me', accent: sessionAccents.ten_things },
};

export function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return iso.slice(0, 10);
  }
}

/** One kept moment. Used wherever a person's cards appear (My moments, History) so they always look the same. */
export function MomentCard({ card, createdAt, showDate = true }: { card: VoiceCard | null | undefined; createdAt: string; showDate?: boolean }) {
  const theme = useTheme();
  const kind = KIND[card?.kind ?? 'moment'] ?? KIND.moment;
  return (
    <View style={[styles.card, { backgroundColor: kind.accent.soft }]}>
      <View style={styles.meta}>
        <View style={[styles.dot, { backgroundColor: kind.accent.base }]} />
        <Overline color={theme.textSecondary}>{kind.label}</Overline>
        {showDate ? (
          <Text variant="caption" color={theme.textTertiary} style={styles.date}>
            {formatDay(createdAt)}
          </Text>
        ) : (
          <Text variant="caption" color={theme.textTertiary} style={styles.date}>
            {new Date(createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
        )}
      </View>
      {card?.headline ? (
        <Text variant="title" style={styles.headline}>
          {card.headline}
        </Text>
      ) : null}
      <Text variant="body">{card?.moment}</Text>
      {card?.tags?.length ? (
        <Text variant="caption" color={theme.textSecondary}>
          {card.tags.join('  ·  ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: spacing.lg, gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  date: { marginLeft: 'auto' },
  headline: { marginTop: spacing.xs },
});
