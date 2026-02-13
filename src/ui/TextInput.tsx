import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  Platform,
} from 'react-native';
import { spacing, radius, typography } from './tokens';
import { useTheme } from './useTheme';
import type { RefObject } from 'react';

interface TextInputProps extends RNTextInputProps {
  error?: boolean;
  inputRef?: RefObject<RNTextInput | null>;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export function TextInput({ error, style, inputRef, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <RNTextInput
      ref={inputRef}
      style={[
        styles.base,
        {
          fontFamily,
          color: theme.text,
          backgroundColor: theme.surface,
          borderColor: error ? theme.error : theme.border,
        },
        style,
      ]}
      placeholderTextColor={theme.textTertiary}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
