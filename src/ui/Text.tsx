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

// One family, so nothing ever disagrees: a heavier weight for headings, regular for reading, medium for labels.
const fontFamilyByVariant: Record<TextVariant, string> = {
  hero: 'Inter_600SemiBold',
  title: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  small: 'Inter_400Regular',
  caption: 'Inter_400Regular',
  overline: 'Inter_500Medium',
  quote: 'Inter_500Medium',
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
    variant === 'hero' ? -0.7 : variant === 'title' ? -0.4 : variant === 'quote' ? -0.2 : variant === 'overline' ? 1.3 : variant === 'bodyMedium' ? -0.1 : 0;

  return (
    <RNText
      style={[
        styles.base,
        {
          fontFamily: medium ? 'Inter_500Medium' : fontFamilyByVariant[variant],
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
