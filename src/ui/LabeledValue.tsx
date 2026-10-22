import { StyleSheet, View } from 'react-native';
import { Overline } from './Overline';
import { Text } from './Text';
import { useTheme } from './useTheme';

/** Label above, value below. The label is small, grey and spaced; the value is the heavier line. For dense screens. */
export function LabeledValue({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Overline>{label}</Overline>
      <Text variant="small" medium>
        {value}
      </Text>
      {secondary ? (
        <Text variant="caption" color={theme.textTertiary}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 2 } });
