import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Skia from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ScreenContainer, Card, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

function withAlpha(hex: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}

function useCanvasSize() {
  const { width } = useWindowDimensions();
  return Math.max(220, Math.min(width - spacing.xl * 2, 360));
}

function DriftCoreJellyCanvas({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const size = useCanvasSize();
  const { Canvas, Rect, Circle, Blur, LinearGradient, vec } = Skia;

  const center = size * 0.5;
  const baseRadius = Math.max(40, size * 0.18);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    wobble.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
  }, [wobble]);

  const orbX = useDerivedValue(() => center + dragX.value);
  const orbY = useDerivedValue(() => center + dragY.value);
  const bubbleX = useDerivedValue(
    () => center + dragX.value * 0.55 + Math.sin(wobble.value * Math.PI * 2) * (8 * intensity)
  );
  const bubbleY = useDerivedValue(
    () => center + dragY.value * 0.55 + Math.cos(wobble.value * Math.PI * 2) * (7 * intensity)
  );
  const orbRadius = useDerivedValue(
    () => baseRadius + Math.sin(wobble.value * Math.PI * 2) * 5 * intensity
  );
  const bubbleRadius = useDerivedValue(
    () => baseRadius * 0.72 + Math.cos(wobble.value * Math.PI * 2) * 4 * intensity
  );
  const coreX = useDerivedValue(
    () => center + dragX.value * 0.18 + Math.sin(wobble.value * Math.PI * 2) * 4
  );
  const coreY = useDerivedValue(
    () => center + dragY.value * 0.18 + Math.cos(wobble.value * Math.PI * 2) * 3
  );
  const coreRadius = useDerivedValue(
    () => 6 + Math.sin(wobble.value * Math.PI * 4) * Math.max(1, 2 * intensity)
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onChange((e) => {
      dragX.value = Math.max(-70, Math.min(70, dragX.value + e.changeX));
      dragY.value = Math.max(-70, Math.min(70, dragY.value + e.changeY));
    })
    .onEnd(() => {
      dragX.value = withSpring(0, { damping: 12, stiffness: 150 });
      dragY.value = withSpring(0, { damping: 12, stiffness: 150 });
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.canvasWrap}>
        <Canvas style={{ width: size, height: size, borderRadius: 24 }}>
          <Rect x={0} y={0} width={size} height={size}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={[theme.backgroundSecondary, withAlpha('#FF7DAF', 0.35)]}
            />
          </Rect>

          <Circle cx={orbX} cy={orbY} r={orbRadius} color={withAlpha(theme.accentLight, 0.74)}>
            <Blur blur={24} />
          </Circle>
          <Circle cx={bubbleX} cy={bubbleY} r={bubbleRadius} color={withAlpha('#FF7DAF', 0.66)}>
            <Blur blur={20} />
          </Circle>
          <Circle cx={coreX} cy={coreY} r={coreRadius} color={withAlpha(theme.text, 0.7)} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

function ViscosityTrailCanvas({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const size = useCanvasSize();
  const { Canvas, Rect, Circle, Blur, LinearGradient, vec } = Skia;

  const center = size * 0.5;
  const leadX = useSharedValue(0);
  const leadY = useSharedValue(0);
  const trailX = useSharedValue(0);
  const trailY = useSharedValue(0);

  useAnimatedReaction(
    () => leadX.value,
    (value) => {
      trailX.value = withSpring(value, {
        damping: 16 + Math.round(5 * intensity),
        stiffness: 110,
      });
    },
    [intensity]
  );

  useAnimatedReaction(
    () => leadY.value,
    (value) => {
      trailY.value = withSpring(value, {
        damping: 16 + Math.round(5 * intensity),
        stiffness: 110,
      });
    },
    [intensity]
  );

  const leadCX = useDerivedValue(() => center + leadX.value);
  const leadCY = useDerivedValue(() => center + leadY.value);
  const trailCX = useDerivedValue(() => center + trailX.value);
  const trailCY = useDerivedValue(() => center + trailY.value);
  const bridgeCX = useDerivedValue(() => (leadCX.value + trailCX.value) * 0.5);
  const bridgeCY = useDerivedValue(() => (leadCY.value + trailCY.value) * 0.5);

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onChange((e) => {
      leadX.value = Math.max(-86, Math.min(86, leadX.value + e.changeX));
      leadY.value = Math.max(-86, Math.min(86, leadY.value + e.changeY));
    })
    .onEnd(() => {
      leadX.value = withSpring(0, { damping: 10, stiffness: 170 });
      leadY.value = withSpring(0, { damping: 10, stiffness: 170 });
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.canvasWrap}>
        <Canvas style={{ width: size, height: size, borderRadius: 24 }}>
          <Rect x={0} y={0} width={size} height={size}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={[withAlpha('#FF7DAF', 0.34), withAlpha(theme.backgroundSecondary, 0.95)]}
            />
          </Rect>

          <Circle cx={bridgeCX} cy={bridgeCY} r={size * 0.1} color={withAlpha('#FFFFFF', 0.48)}>
            <Blur blur={26} />
          </Circle>
          <Circle cx={trailCX} cy={trailCY} r={size * 0.14} color={withAlpha(theme.accentLight, 0.58)}>
            <Blur blur={16} />
          </Circle>
          <Circle cx={leadCX} cy={leadCY} r={size * 0.12} color={withAlpha('#FF7DAF', 0.78)}>
            <Blur blur={12} />
          </Circle>
          <Circle cx={center} cy={center} r={5} color={withAlpha(theme.text, 0.52)} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

function TapRippleCanvas({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const size = useCanvasSize();
  const { Canvas, Rect, Circle, Blur, LinearGradient, vec } = Skia;

  const center = size * 0.5;
  const tapX = useSharedValue(center);
  const tapY = useSharedValue(center);
  const rippleA = useSharedValue(0);
  const rippleB = useSharedValue(0);

  const firstR = useDerivedValue(() => 18 + rippleA.value * 90 * intensity);
  const secondR = useDerivedValue(() => 8 + rippleB.value * 70 * intensity);
  const firstAlpha = useDerivedValue(() => 1 - rippleA.value);
  const secondAlpha = useDerivedValue(() => 1 - rippleB.value);

  const tap = Gesture.Tap().onStart((e) => {
    tapX.value = e.x;
    tapY.value = e.y;
    rippleA.value = 0;
    rippleB.value = 0;
    rippleA.value = withTiming(1, { duration: 680 });
    rippleB.value = withTiming(1, { duration: 900 });
  });

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.canvasWrap}>
        <Canvas style={{ width: size, height: size, borderRadius: 24 }}>
          <Rect x={0} y={0} width={size} height={size}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={[theme.backgroundSecondary, withAlpha('#FFFFFF', 0.36)]}
            />
          </Rect>

          <Circle cx={tapX} cy={tapY} r={firstR} color={withAlpha('#FF7DAF', 0.7)} opacity={firstAlpha}>
            <Blur blur={8} />
          </Circle>
          <Circle cx={tapX} cy={tapY} r={secondR} color={withAlpha(theme.accentLight, 0.82)} opacity={secondAlpha}>
            <Blur blur={6} />
          </Circle>
          <Circle cx={tapX} cy={tapY} r={7} color={withAlpha(theme.text, 0.55)} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

function StaticFallbackCanvas({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const size = useCanvasSize();
  const { Canvas, Rect, Circle, Blur } = Skia;

  return (
    <View style={styles.canvasWrap}>
      <Canvas style={{ width: size, height: size, borderRadius: 24 }}>
        <Rect x={0} y={0} width={size} height={size} color={theme.backgroundSecondary} />
        <Circle
          cx={size * 0.35}
          cy={size * 0.4}
          r={size * 0.24}
          color={withAlpha(theme.accentLight, 0.32 * intensity)}
        >
          <Blur blur={32} />
        </Circle>
        <Circle
          cx={size * 0.66}
          cy={size * 0.64}
          r={size * 0.19}
          color={withAlpha('#FF7DAF', 0.66)}
        >
          <Blur blur={28} />
        </Circle>
      </Canvas>
    </View>
  );
}

export default function SkiaLabScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [intensity, setIntensity] = useState(1);
  const skiaAny = Skia as any;

  const features = useMemo(() => {
    const keys = Object.keys(Skia);
    return {
      keyCount: keys.length,
      hasLinearGradient: typeof (Skia as any).LinearGradient !== 'undefined',
      hasUseValue: typeof skiaAny.useValue === 'function',
      hasUseComputedValue: typeof skiaAny.useComputedValue === 'function',
      hasRunTiming: typeof skiaAny.runTiming === 'function',
    };
  }, [skiaAny]);

  const canAnimate = features.hasUseValue && features.hasUseComputedValue && features.hasRunTiming;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
        <Text variant="title">Skia Lab</Text>
        <Text variant="body" color={theme.textSecondary}>
          Safe playground for premium motion experiments.
        </Text>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Runtime check</Text>
          <Text variant="small" color={theme.textSecondary}>
            exports: {features.keyCount}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            LinearGradient: {features.hasLinearGradient ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            useValue: {features.hasUseValue ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            useComputedValue: {features.hasUseComputedValue ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            runTiming: {features.hasRunTiming ? 'yes' : 'no'}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">1. Drift Core Jelly</Text>
          <Text variant="caption" color={theme.textTertiary}>
            Drag and release. Core now drifts and breathes instead of staying fixed.
          </Text>
          <DriftCoreJellyCanvas intensity={intensity} />
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">2. Viscosity Trail</Text>
          <Text variant="caption" color={theme.textTertiary}>
            Lead orb follows finger, trailing orb catches up with softer spring.
          </Text>
          <ViscosityTrailCanvas intensity={intensity} />
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">3. Tap Ripple Burst</Text>
          <Text variant="caption" color={theme.textTertiary}>
            Tap anywhere to emit layered jelly ripples.
          </Text>
          <TapRippleCanvas intensity={intensity} />
        </Card>

        {!canAnimate ? (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Static fallback preview</Text>
            <Text variant="caption" color={theme.textTertiary}>
              This Skia runtime does not expose legacy timing hooks.
            </Text>
            <StaticFallbackCanvas intensity={intensity} />
          </Card>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.controls}>
            <Pressable
              style={[styles.controlButton, { borderColor: theme.border }]}
              onPress={() => setIntensity((v) => Math.max(0.4, Number((v - 0.2).toFixed(2))))}
            >
              <Text variant="small">- Intensity</Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, { borderColor: theme.border }]}
              onPress={() => setIntensity((v) => Math.min(2.2, Number((v + 0.2).toFixed(2))))}
            >
              <Text variant="small">+ Intensity</Text>
            </Pressable>
          </View>
          <Text variant="caption" color={theme.textTertiary}>
            intensity: {intensity.toFixed(1)}
          </Text>
        </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  canvasWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
