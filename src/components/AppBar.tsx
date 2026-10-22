import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { BluumMark } from './BluumMark';

/** The bar at the top of the main screens: the mark and the name on the left, one small thing on the right. */
export function AppBar({ right }: { right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface }]}>
      <View style={styles.brand}>
        <BluumMark size={26} />
        <Text variant="bodyMedium" style={styles.name}>
          bluum
        </Text>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.5 },
  right: { flexDirection: 'row', alignItems: 'center' },
});
