import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text, spacing } from '../ui';
import { useTheme } from '../ui/useTheme';

interface MoodPickerProps {
  onSelect: (rating: number) => Promise<void>;
  disabled?: boolean;
  currentMood?: number | null;
  showChangeOption?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MoodFace({ rating, size, color }: { rating: number; size: number; color: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const eyeY = cy - r * 0.15;
  const eyeOffset = r * 0.25;
  const eyeRadius = r * 0.08;

  const getMouthPath = () => {
    const mouthY = cy + r * 0.2;
    const mouthWidth = r * 0.5;

    switch (rating) {
      case 1: // Very sad - deep frown
        return `M ${cx - mouthWidth} ${mouthY + r * 0.15} Q ${cx} ${mouthY - r * 0.2}, ${cx + mouthWidth} ${mouthY + r * 0.15}`;
      case 2: // Sad - slight frown
        return `M ${cx - mouthWidth * 0.8} ${mouthY + r * 0.08} Q ${cx} ${mouthY - r * 0.1}, ${cx + mouthWidth * 0.8} ${mouthY + r * 0.08}`;
      case 3: // Neutral - straight line
        return `M ${cx - mouthWidth * 0.6} ${mouthY} L ${cx + mouthWidth * 0.6} ${mouthY}`;
      case 4: // Happy - slight smile
        return `M ${cx - mouthWidth * 0.8} ${mouthY - r * 0.05} Q ${cx} ${mouthY + r * 0.15}, ${cx + mouthWidth * 0.8} ${mouthY - r * 0.05}`;
      case 5: // Very happy - big smile
        return `M ${cx - mouthWidth} ${mouthY - r * 0.1} Q ${cx} ${mouthY + r * 0.25}, ${cx + mouthWidth} ${mouthY - r * 0.1}`;
      default:
        return '';
    }
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Circle cx={cx - eyeOffset} cy={eyeY} r={eyeRadius} fill={color} />
      <Circle cx={cx + eyeOffset} cy={eyeY} r={eyeRadius} fill={color} />
      <Path
        d={getMouthPath()}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MoodButton({
  rating,
  onPress,
  disabled,
  isSelected,
}: {
  rating: number;
  onPress: () => void;
  disabled?: boolean;
  isSelected?: boolean;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.15, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.moodButton,
        animatedStyle,
        { opacity: disabled ? 0.5 : 1 },
        isSelected && { backgroundColor: theme.accentLight },
      ]}
    >
      <MoodFace
        rating={rating}
        size={36}
        color={isSelected ? theme.accent : theme.textTertiary}
      />
    </AnimatedPressable>
  );
}

export function MoodPicker({
  onSelect,
  disabled,
  currentMood,
  showChangeOption,
}: MoodPickerProps) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(!currentMood);

  const handleSelect = async (rating: number) => {
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await onSelect(rating);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPicker(false);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = async () => {
    await Haptics.selectionAsync();
    setShowPicker(true);
  };

  if (currentMood && !showPicker) {
    return (
      <Animated.View style={styles.currentMood} entering={FadeIn.duration(300)}>
        <View style={styles.moodChip}>
          <MoodFace rating={currentMood} size={24} color={theme.text} />
          <Text variant="small" color={theme.textSecondary}>
            Today
          </Text>
        </View>
        {showChangeOption && (
          <Pressable onPress={handleChange} hitSlop={12}>
            <Text variant="small" color={theme.textTertiary}>
              Change
            </Text>
          </Pressable>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
      <Text variant="caption" color={theme.textTertiary} style={styles.label}>
        Check in.
      </Text>
      <View style={styles.picker}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <MoodButton
            key={rating}
            rating={rating}
            onPress={() => handleSelect(rating)}
            disabled={isSubmitting || disabled}
            isSelected={currentMood === rating}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    textAlign: 'center',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  moodButton: {
    padding: spacing.sm,
    borderRadius: 999,
  },
  currentMood: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
