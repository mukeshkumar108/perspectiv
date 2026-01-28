import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { ArrowUp } from 'lucide-react-native';
import { spacing, radius, typography } from '../ui/tokens';
import { useTheme } from '../ui/useTheme';

interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
}

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export function Composer({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Write something...',
  disabled = false,
  loading = false,
  maxLength,
  minHeight = 44,
  maxHeight = 160,
}: ComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<RNTextInput>(null);
  const [inputHeight, setInputHeight] = useState(minHeight);

  const buttonScale = useSharedValue(1);
  const canSubmit = value.trim().length > 0 && !disabled && !loading;

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: interpolate(buttonScale.value, [0.9, 1], [0.7, 1]),
  }));

  const handlePressIn = () => {
    if (canSubmit) {
      buttonScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    onSubmit();
  };

  const handleContentSizeChange = (event: {
    nativeEvent: { contentSize: { height: number } };
  }) => {
    const newHeight = Math.min(
      Math.max(event.nativeEvent.contentSize.height, minHeight),
      maxHeight
    );
    setInputHeight(newHeight);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.borderLight,
        },
      ]}
    >
      <RNTextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            fontFamily,
            color: theme.text,
            height: inputHeight,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        multiline
        maxLength={maxLength}
        editable={!disabled && !loading}
        onContentSizeChange={handleContentSizeChange}
        textAlignVertical="center"
      />
      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!canSubmit}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSubmit ? theme.primary : theme.border,
            },
          ]}
        >
          <ArrowUp
            size={20}
            color={canSubmit ? theme.primaryText : theme.textTertiary}
            strokeWidth={2.5}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
