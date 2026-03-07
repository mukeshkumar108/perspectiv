import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Card, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

type GameHubItemProps = {
  title: string;
  subtitle: string;
  meta?: string;
  onPress: () => void;
};

export function GameHubItem({ title, subtitle, meta, onPress }: GameHubItemProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text variant="bodyMedium">{title}</Text>
            <Text variant="small" color={theme.textSecondary}>
              {subtitle}
            </Text>
            {meta ? (
              <Text variant="caption" color={theme.textTertiary}>
                {meta}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={theme.textTertiary} strokeWidth={2} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
});
