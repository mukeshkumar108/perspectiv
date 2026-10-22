import { TextProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from './useTheme';

/** A small spaced capital label that sits above a value. */
export function Overline({ children, color, ...props }: TextProps & { color?: string; children: string }) {
  const theme = useTheme();
  return (
    <Text variant="overline" color={color ?? theme.textTertiary} {...props}>
      {children.toUpperCase()}
    </Text>
  );
}
