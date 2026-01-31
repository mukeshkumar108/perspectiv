import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { spacing, radius, typography } from './tokens';
import { useTheme } from './useTheme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: ViewStyle;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  withArrow?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  icon,
  iconPosition = 'left',
  withArrow = false,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (e: any) => {
    scale.value = withTiming(0.98, { duration: 100 });
    opacity.value = withTiming(0.9, { duration: 100 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withTiming(1, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
    onPressOut?.(e);
  };

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      textColor: theme.primaryText,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: theme.backgroundSecondary,
      textColor: theme.textSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: theme.textSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
    },
  };

  const currentVariant = variantStyles[variant];
  const showArrow = withArrow && !loading;

  return (
    <AnimatedPressable
      style={[
        styles.base,
        {
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
          borderWidth: currentVariant.borderWidth,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            variant="bodyMedium"
            color={currentVariant.textColor}
            style={styles.text}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
          {showArrow && (
            <View
              style={[
                styles.arrowWrap,
                { backgroundColor: theme.background },
              ]}
            >
              <ArrowRight
                size={16}
                color={currentVariant.backgroundColor}
                strokeWidth={2}
              />
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: typography.bodyMedium.fontWeight,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
