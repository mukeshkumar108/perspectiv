import { View, ViewProps, StyleSheet } from 'react-native';
import { spacing, radius } from './tokens';
import { useTheme } from './useTheme';

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
}

export function Card({ padding = 'lg', style, children, ...props }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.surface,
          borderColor: theme.borderLight,
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
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
