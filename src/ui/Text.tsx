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
  hero: 'InstrumentSans_400Regular',
  title: 'InstrumentSans_400Regular',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_400Regular',
  small: 'InstrumentSans_400Regular',
  caption: 'InstrumentSans_400Regular',
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
  const headingLetterSpacing = variant === 'hero' ? -0.9 : variant === 'title' ? -0.6 : -0.2;

  return (
    <RNText
      style={[
        styles.base,
        {
          fontFamily: fontFamilyByVariant[variant],
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: undefined,
          letterSpacing: headingLetterSpacing,
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
