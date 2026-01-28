import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '../ui/useTheme';

const AnimatedG = Animated.createAnimatedComponent(G);

interface BloomVisualProps {
  size?: number;
  animate?: boolean;
}

export function BloomVisual({ size = 200, animate = true }: BloomVisualProps) {
  const theme = useTheme();
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      breathe.value = withRepeat(
        withTiming(1.05, {
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [animate, breathe]);

  const animatedGroupProps = useAnimatedProps(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const center = size / 2;
  const petalCount = 8;
  const petalRadius = size * 0.15;
  const orbitRadius = size * 0.25;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <AnimatedG
          animatedProps={animatedGroupProps}
          origin={`${center}, ${center}`}
        >
          {/* Center dot */}
          <Circle
            cx={center}
            cy={center}
            r={size * 0.08}
            fill={theme.accent}
          />

          {/* Petals */}
          {Array.from({ length: petalCount }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / petalCount - Math.PI / 2;
            const x = center + Math.cos(angle) * orbitRadius;
            const y = center + Math.sin(angle) * orbitRadius;
            const opacity = 0.3 + (i % 2) * 0.2;

            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={petalRadius}
                fill={theme.accent}
                opacity={opacity}
              />
            );
          })}

          {/* Outer ring dots */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / 16;
            const x = center + Math.cos(angle) * (size * 0.42);
            const y = center + Math.sin(angle) * (size * 0.42);

            return (
              <Circle
                key={`outer-${i}`}
                cx={x}
                cy={y}
                r={size * 0.015}
                fill={theme.accent}
                opacity={0.2}
              />
            );
          })}
        </AnimatedG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
