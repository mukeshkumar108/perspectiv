import { StyleSheet } from 'react-native';
import { PressScale } from './PressScale';
import { Text } from './Text';
import { useTheme } from './useTheme';
import { radius, spacing } from './tokens';

/** A selectable chip. Filled ink when chosen, outlined when not. */
export function Pill({ label, active, onPress, tone }: { label: string; active?: boolean; onPress?: () => void; tone?: string }) {
  const theme = useTheme();
  const fill = active ? tone ?? theme.text : 'transparent';
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.pill, { borderColor: active ? tone ?? theme.text : theme.border, backgroundColor: fill }]}
    >
      <Text variant="small" medium={!!active} color={active ? (tone ? theme.text : theme.background) : theme.textSecondary}>
        {label}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
});
