import { View, ViewProps, StyleSheet } from 'react-native';
import { spacing, radius } from './tokens';
import { useTheme } from './useTheme';

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
  variant?: 'default' | 'subtle';
}

export function Card({
  padding = 'lg',
  variant = 'default',
  style,
  children,
  ...props
}: CardProps) {
  const theme = useTheme();

  const isSubtle = variant === 'subtle';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isSubtle ? 'transparent' : theme.backgroundSecondary,
          padding: spacing[padding],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
  },
});
