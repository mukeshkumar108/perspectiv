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
    <View style={[styles.container, { backgroundColor: theme.accentLight }]}>
      <Flame size={16} color={theme.accent} strokeWidth={2} />
      <Text variant="small" color={theme.accent}>
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
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
});
