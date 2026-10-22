import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { PressScale } from './PressScale';
import { Text } from './Text';
import { useTheme } from './useTheme';
import { brand, radius, spacing } from './tokens';

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  /** 'solid' is the main action, 'outline' the quieter one. */
  variant?: 'solid' | 'outline' | 'pink';
  disabled?: boolean;
  loading?: boolean;
  arrow?: boolean;
  icon?: ReactNode;
}

/** A button that always fits its container: full width, fixed height, text centred. The one button new screens use. */
export function PrimaryButton({ title, onPress, variant = 'solid', disabled, loading, arrow, icon }: PrimaryButtonProps) {
  const theme = useTheme();
  const solid = variant === 'solid';
  const pink = variant === 'pink';
  const bg = solid ? theme.text : pink ? brand.pink : 'transparent';
  const fg = solid ? theme.background : theme.text;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.btn, { backgroundColor: bg, borderColor: solid || pink ? 'transparent' : theme.text, opacity: disabled ? 0.35 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="bodyMedium" medium color={fg} numberOfLines={1}>
            {title}
          </Text>
          {arrow ? <ArrowRight size={18} color={fg} strokeWidth={2} /> : null}
        </View>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
