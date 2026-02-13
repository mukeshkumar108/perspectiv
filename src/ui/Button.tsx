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
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { spacing, radius, typography } from './tokens';
import { useTheme } from './useTheme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type VariantStyle = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  labelBackground?: string;
  arrowBackground?: string;
};

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
  onPress,
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
    scale.value = withSpring(0.97, { stiffness: 240, damping: 18 });
    opacity.value = withSpring(0.92, { stiffness: 240, damping: 18 });
    if (!disabled && !loading) {
      void Haptics.selectionAsync();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { stiffness: 220, damping: 16 });
    opacity.value = withSpring(1, { stiffness: 220, damping: 16 });
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    onPress?.(e);
  };

  const variantStyles: Record<ButtonVariant, VariantStyle> = {
    primary: {
      backgroundColor: 'transparent',
      textColor: theme.surface,
      labelBackground: theme.text,
      arrowBackground: '#FF7DAF',
      borderColor: 'transparent',
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'transparent',
      textColor: theme.text,
      borderColor: theme.text,
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: theme.textSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
    },
  };

  const currentVariant = variantStyles[variant];
  const showArrow = (variant === 'primary' ? true : withArrow) && !loading;

  const isPrimary = variant === 'primary';
  const primaryVariant = variantStyles.primary;

  return (
    <AnimatedPressable
      style={[
        styles.base,
        !isPrimary && styles.secondaryBase,
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
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.textColor} size="small" />
      ) : isPrimary ? (
        <View style={styles.primaryWrap}>
          <View
            style={[
              styles.primaryLabel,
              { backgroundColor: primaryVariant.labelBackground },
            ]}
          >
            <View style={styles.primaryContent}>
              {icon && iconPosition === 'left' && (
                <View style={styles.iconLeft}>{icon}</View>
              )}
              <Text
                variant="bodyMedium"
                color={currentVariant.textColor}
                style={[styles.text, styles.primaryText]}
              >
                {title}
              </Text>
              {icon && iconPosition === 'right' && (
                <View style={styles.iconRight}>{icon}</View>
              )}
            </View>
          </View>
          {showArrow && (
            <View
              style={[
                styles.primaryArrow,
                { backgroundColor: primaryVariant.arrowBackground },
              ]}
            >
              <ArrowRight size={24} color="#231E15" strokeWidth={2.5} />
            </View>
          )}
        </View>
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
                { backgroundColor: '#FF7782' },
              ]}
            >
              <ArrowRight
                size={16}
                color="#FFFFFF"
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
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryBase: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: typography.bodyMedium.fontWeight,
    fontFamily: 'InstrumentSans_500Medium',
  },
  primaryText: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  arrowWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  primaryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryLabel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.full,
    minHeight: 60,
    justifyContent: 'center',
  },
  primaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryArrow: {
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
});
