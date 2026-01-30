import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography } from './tokens';
import { useTheme } from './useTheme';

type TextVariant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

const fontFamilyByVariant: Record<TextVariant, string> = {
  hero: 'RadioCanadaBig_600SemiBold',
  title: 'RadioCanadaBig_600SemiBold',
  body: 'Geist_200ExtraLight',
  bodyMedium: 'Geist_400Regular',
  small: 'Geist_400Regular',
  caption: 'Geist_400Regular',
};

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
          fontFamily: fontFamilyByVariant[variant],
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: undefined,
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
