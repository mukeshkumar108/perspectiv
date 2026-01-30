import { View, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Text, spacing, radius } from '../ui';
import { useTheme } from '../ui/useTheme';

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  const theme = useTheme();

  if (count === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.text,
        },
      ]}
    >
      <Flame size={16} color={theme.text} strokeWidth={2} />
      <Text variant="small" color={theme.text} style={styles.countText}>
        {count} day{count !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  countText: {
    paddingRight: spacing.xs,
  },
});
