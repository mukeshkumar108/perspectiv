import { View, ViewProps, StyleSheet } from 'react-native';
import { layout, radius } from './tokens';
import { useTheme } from './useTheme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'subtle';
}

/** The one card: a soft surface, a large radius and even padding. Everything that holds content sits in one of these. */
export function Card({ variant = 'default', style, children, ...props }: CardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: variant === 'subtle' ? 'transparent' : theme.surface }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.card, padding: layout.card },
});
