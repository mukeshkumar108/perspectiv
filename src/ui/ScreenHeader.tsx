import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme } from './useTheme';
import { spacing } from './tokens';

/**
 * The header every pushed screen uses: back arrow on the left, a title, an optional action on the right.
 * Nothing sits at the very top right: the Expo Go dev menu button floats there in development and covers it.
 */
export function ScreenHeader({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={16} accessibilityLabel="Back" style={styles.side}>
        <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
      </Pressable>
      <Text variant="bodyMedium" medium style={styles.title} numberOfLines={1}>
        {title ?? ''}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.md, minHeight: 48 },
  side: { width: 72 },
  right: { alignItems: 'flex-end', marginRight: 56 },
  title: { flex: 1, textAlign: 'center' },
});
