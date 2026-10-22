import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography } from './tokens';
import { useTheme } from './useTheme';

type TextVariant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  /** The heavier of the two loaded weights, for labels and emphasis. */
  medium?: boolean;
}

const fontFamilyByVariant: Record<TextVariant, string> = {
  hero: 'InstrumentSans_400Regular',
  title: 'InstrumentSans_500Medium',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_400Regular',
  small: 'InstrumentSans_400Regular',
  caption: 'InstrumentSans_400Regular',
  overline: 'InstrumentSans_500Medium',
};

export function Text({
  variant = 'body',
  color,
  center,
  medium,
  style,
  children,
  ...props
}: TextProps) {
  const theme = useTheme();
  const variantStyle = typography[variant];
  const headingLetterSpacing =
    variant === 'hero' ? -0.9 : variant === 'title' ? -0.55 : variant === 'overline' ? 1.4 : variant === 'bodyMedium' ? -0.15 : 0;

  return (
    <RNText
      style={[
        styles.base,
        {
          fontFamily: medium ? 'InstrumentSans_500Medium' : fontFamilyByVariant[variant],
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
  base: {},
});
