import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COUNT = 14;

function Particle({ index, color, run, spread }: { index: number; color: string; run: number; spread: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (run === 0) return;
    t.value = 0;
    t.value = withDelay((index % 3) * 28, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
  }, [run, index, t]);

  const angle = (index / COUNT) * Math.PI * 2 + (index % 2) * 0.22;
  const distance = spread * (0.55 + ((index * 37) % 10) / 22);
  const size = 5 + (index % 3) * 2.5;
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value * t.value,
    transform: [
      { translateX: Math.cos(angle) * distance * t.value },
      { translateY: Math.sin(angle) * distance * t.value },
      { scale: 1 - t.value * 0.6 },
    ],
  }));
  return <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/** A small burst of dots from the centre of its box. Change `run` (any increasing number) to play it. Used for every little reward. */
export function Burst({ color, run, spread = 90 }: { color: string; run: number; spread?: number }) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {Array.from({ length: COUNT }, (_, i) => (
        <Particle key={i} index={i} color={color} run={run} spread={spread} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
});
