import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { PressScale } from './PressScale';
import { Text } from './Text';
import { useTheme } from './useTheme';
import { radius, spacing } from './tokens';

interface AccentCardProps {
  title: string;
  subtitle?: string;
  /** The card's colour: the soft tint fills it, the base colour fills the icon disc. */
  accent: { base: string; soft: string };
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/** A tappable card with its own colour. Used for sessions, settings links, games and assessments so they all look related. */
export function AccentCard({ title, subtitle, accent, icon, onPress, disabled }: AccentCardProps) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.card, { backgroundColor: accent.soft, opacity: disabled ? 0.6 : 1 }]}
    >
      {icon ? <View style={[styles.disc, { backgroundColor: accent.base }]}>{icon}</View> : null}
      <View style={styles.text}>
        <Text variant="bodyMedium" medium>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color={theme.textSecondary} style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ArrowRight size={18} color={theme.text} strokeWidth={1.8} style={styles.arrow} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: 24, padding: 16 },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, paddingTop: 1 },
  sub: { marginTop: 3 },
  arrow: { marginTop: 11 },
});
