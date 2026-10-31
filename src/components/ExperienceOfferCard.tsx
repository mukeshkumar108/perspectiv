import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Card, PrimaryButton, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import type { ExperienceOffer } from '@/src/voice/stream/experiences';

/** The card the companion puts on screen when it offers an activity. Yes or not now, by tap or by voice. */
export function ExperienceOfferCard({ offer, onAccept, onDecline }: { offer: ExperienceOffer; onAccept: () => void; onDecline: () => void }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInUp.duration(320)} style={styles.wrap}>
      <Card>
        <Text variant="title">{offer.title}</Text>
        <Text variant="small" color={theme.textSecondary} style={styles.sub}>
          About two minutes. Say yes, or tap.
        </Text>
        <View style={styles.row}>
          <PrimaryButton title="Yes" variant="accent" onPress={onAccept} />
          <PrimaryButton title="Not now" variant="outline" onPress={onDecline} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  sub: { marginTop: spacing.xs, marginBottom: spacing.md },
  row: { gap: spacing.sm },
});
