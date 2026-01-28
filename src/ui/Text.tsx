import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';
import { typography } from './tokens';
import { useTheme } from './useTheme';

type TextVariant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export function Text({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...props
}: TextProps) {
  const theme = useTheme();
  const variantStyle = typography[variant];

  return (
    <RNText
      style={[
        styles.base,
        {
          fontFamily,
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
          color: color ?? theme.text,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: -0.2,
  },
});
