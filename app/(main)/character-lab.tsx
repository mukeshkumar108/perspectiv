import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Skia from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Extrapolation,
  Easing,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

function withAlpha(hex: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}

function CharacterPrototype({
  mood,
  jumpSignal,
  reactSignal,
  spinSignal,
  heavyBodyPulse = false,
}: {
  mood: number;
  jumpSignal: number;
  reactSignal: number;
  spinSignal: number;
  heavyBodyPulse?: boolean;
}) {
  // Mood scale is explicit: 1 = happiest, 5 = saddest.
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { Canvas, Circle, Rect, Path, Blur, LinearGradient, vec } = Skia;
  const size = Math.max(260, Math.min(width - spacing.xl * 2, 380));
  const cx = size * 0.5;
  const cy = size * 0.56;

  const breath = useSharedValue(0);
  const blink = useSharedValue(0);
  const jump = useSharedValue(0);
  const react = useSharedValue(0);
  const spin = useSharedValue(0);
  const moodShared = useSharedValue(Math.max(1, Math.min(5, mood)));

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    blink.value = withRepeat(
      withSequence(
        withDelay(2300, withTiming(0, { duration: 1 })),
        withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [blink, breath]);

  useEffect(() => {
    moodShared.value = withSpring(Math.max(1, Math.min(5, mood)), {
      damping: 14,
      stiffness: 140,
    });
  }, [mood, moodShared]);

  useEffect(() => {
    if (jumpSignal <= 0) return;
    jump.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 340, easing: Easing.out(Easing.exp) })
    );
  }, [jumpSignal, jump]);

  useEffect(() => {
    if (reactSignal <= 0) return;
    react.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [reactSignal, react]);

  useEffect(() => {
    if (spinSignal <= 0) return;
    spin.value = 0;
    spin.value = withSequence(
      withTiming(1.06, {
        duration: 520,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
      withSpring(1, {
        damping: 11,
        stiffness: 150,
        mass: 0.72,
      })
    );
  }, [spinSignal, spin]);

  const flowerSpinRad = useDerivedValue(
    () => (interpolate(spin.value, [0, 1], [0, 360], Extrapolation.CLAMP) * Math.PI) / 180
  );

  const baseBodyRadius = size * 0.28;
  const bodyBase = 0.28;
  const bodyLow = heavyBodyPulse ? 0.86 : 0.995;
  const bodyHigh = heavyBodyPulse ? 1.28 : 1.018;
  const headY = useDerivedValue(
    () => cy + interpolate(jump.value, [0, 1], [0, -28]) + interpolate(breath.value, [0, 1], [1.8, -1.8])
  );
  const bodyRadius = useDerivedValue(() => size * bodyBase * interpolate(breath.value, [0, 1], [bodyLow, bodyHigh]));
  const limbScale = useDerivedValue(() => bodyRadius.value / baseBodyRadius);
  const faceDriftY = useDerivedValue(
    () => interpolate(breath.value, [0, 1], [1.4, -1.4]) * (heavyBodyPulse ? 1.45 : 1)
  );
  const facePulseLift = useDerivedValue(() =>
    heavyBodyPulse ? (bodyRadius.value - baseBodyRadius) * 0.34 : 0
  );
  const faceAnchorY = useDerivedValue(() => headY.value + faceDriftY.value - facePulseLift.value);
  const faceInset = useDerivedValue(
    () => interpolate(breath.value, [0, 1], [1, heavyBodyPulse ? 0.93 : 0.97])
  );
  const eyeOpen = useDerivedValue(
    () => interpolate(moodShared.value, [1, 3, 5], [0.75, 1, 1.12]) * interpolate(blink.value, [0, 1], [1, 0.06])
  );
  const mouthCurve = useDerivedValue(() => interpolate(moodShared.value, [1, 3, 5], [-16, 0, 18]));
  const browLift = useDerivedValue(() => interpolate(moodShared.value, [1, 2, 3, 4, 5], [-3.5, -3.5, 0, 3.5, 3.5]));
  const browAngleDelta = useDerivedValue(
    () => interpolate(moodShared.value, [1, 2, 3, 4, 5], [0.037, 0.037, 0.04, 0.042, 0.042])
  );
  const haloRadius = useDerivedValue(() => interpolate(react.value, [0, 1], [size * 0.28, size * 0.42]));
  const haloOpacity = useDerivedValue(() => interpolate(react.value, [0, 1], [0, 0.58]));
  const mouthPath = useDerivedValue(() => {
    const w = size * 0.046 * faceInset.value;
    const y = faceAnchorY.value - size * 0.034;
    const mouthCx = cx + size * 0.008;
    const c = y - mouthCurve.value;
    return `M ${mouthCx - w} ${y} Q ${mouthCx} ${c} ${mouthCx + w} ${y}`;
  });
  const leftBrowPath = useDerivedValue(() => {
    const y1 = faceAnchorY.value - size * 0.165 + browLift.value;
    const y2 = y1 - size * browAngleDelta.value * faceInset.value;
    return `M ${cx - size * 0.132 * faceInset.value} ${y1} L ${cx - size * 0.03 * faceInset.value} ${y2}`;
  });
  const rightBrowPath = useDerivedValue(() => {
    const y1 = faceAnchorY.value - size * 0.165 + browLift.value;
    const y2 = y1 - size * browAngleDelta.value * faceInset.value;
    return `M ${cx + size * 0.132 * faceInset.value} ${y1} L ${cx + size * 0.03 * faceInset.value} ${y2}`;
  });
  const pupilMoodScale = useDerivedValue(() => interpolate(moodShared.value, [1, 2, 3, 5], [1.06, 1.06, 1.12, 1.5]));
  const pupilRadius = useDerivedValue(() => size * 0.03 * eyeOpen.value * pupilMoodScale.value);
  const pupilSpread = useDerivedValue(() => interpolate(moodShared.value, [1, 2, 3, 5], [0.011, 0.011, 0.014, 0.022]));
  const leftPupilX = useDerivedValue(
    () => cx - size * pupilSpread.value * faceInset.value + Math.sin(breath.value * Math.PI * 2) * 1.2
  );
  const rightPupilX = useDerivedValue(
    () => cx + size * pupilSpread.value * faceInset.value - Math.sin(breath.value * Math.PI * 2) * 1.2
  );
  const pupilMoodDrop = useDerivedValue(() => interpolate(moodShared.value, [1, 2, 3, 5], [0.8, 0.8, 1.2, 6]));
  const pupilY = useDerivedValue(
    () => faceAnchorY.value - size * 0.155 + Math.cos(breath.value * Math.PI * 2) * 1.0 + pupilMoodDrop.value
  );
  const earY = useDerivedValue(() => headY.value - size * 0.01 * limbScale.value);
  const footY = useDerivedValue(() => headY.value + size * 0.25 * limbScale.value);
  const earRadius = useDerivedValue(() => size * 0.045 * limbScale.value);
  const footRadius = useDerivedValue(() => size * 0.047 * limbScale.value);
  const earOffsetX = useDerivedValue(() => size * 0.27 * limbScale.value);
  const footOffsetX = useDerivedValue(() => size * 0.11 * limbScale.value);
  const leftEarX = useDerivedValue(() => cx - earOffsetX.value);
  const rightEarX = useDerivedValue(() => cx + earOffsetX.value);
  const leftFootX = useDerivedValue(() => cx - footOffsetX.value);
  const rightFootX = useDerivedValue(() => cx + footOffsetX.value);
  const eyeWhiteY = useDerivedValue(() => faceAnchorY.value - size * 0.14);
  const eyeBlackY = useDerivedValue(
    () => faceAnchorY.value - size * 0.155 + pupilMoodDrop.value
  );
  const leftEyeWhiteX = useDerivedValue(() => cx - size * 0.06 * faceInset.value);
  const rightEyeWhiteX = useDerivedValue(() => cx + size * 0.06 * faceInset.value);
  const blackPupilSpread = useDerivedValue(() =>
    interpolate(moodShared.value, [1, 2, 3, 5], [0.022, 0.022, 0.026, 0.038])
  );
  const leftEyeBlackX = useDerivedValue(() => cx - size * blackPupilSpread.value * faceInset.value);
  const rightEyeBlackX = useDerivedValue(() => cx + size * blackPupilSpread.value * faceInset.value);
  const flowerY0 = useDerivedValue(() => headY.value - bodyRadius.value - size * 0.004);
  const flowerRingRadius = size * 0.042;
  const flowerPetalRadius = size * 0.028;
  const flowerAngles = [-54, 18, 90, 162, 234];
  const flowerA1 = (flowerAngles[0] * Math.PI) / 180;
  const flowerA2 = (flowerAngles[1] * Math.PI) / 180;
  const flowerA3 = (flowerAngles[2] * Math.PI) / 180;
  const flowerA4 = (flowerAngles[3] * Math.PI) / 180;
  const flowerA5 = (flowerAngles[4] * Math.PI) / 180;
  const flowerX1 = useDerivedValue(() => cx + Math.cos(flowerA1 + flowerSpinRad.value) * flowerRingRadius);
  const flowerY1 = useDerivedValue(() => flowerY0.value + Math.sin(flowerA1 + flowerSpinRad.value) * flowerRingRadius);
  const flowerX2 = useDerivedValue(() => cx + Math.cos(flowerA2 + flowerSpinRad.value) * flowerRingRadius);
  const flowerY2 = useDerivedValue(() => flowerY0.value + Math.sin(flowerA2 + flowerSpinRad.value) * flowerRingRadius);
  const flowerX3 = useDerivedValue(() => cx + Math.cos(flowerA3 + flowerSpinRad.value) * flowerRingRadius);
  const flowerY3 = useDerivedValue(() => flowerY0.value + Math.sin(flowerA3 + flowerSpinRad.value) * flowerRingRadius);
  const flowerX4 = useDerivedValue(() => cx + Math.cos(flowerA4 + flowerSpinRad.value) * flowerRingRadius);
  const flowerY4 = useDerivedValue(() => flowerY0.value + Math.sin(flowerA4 + flowerSpinRad.value) * flowerRingRadius);
  const flowerX5 = useDerivedValue(() => cx + Math.cos(flowerA5 + flowerSpinRad.value) * flowerRingRadius);
  const flowerY5 = useDerivedValue(() => flowerY0.value + Math.sin(flowerA5 + flowerSpinRad.value) * flowerRingRadius);

  const tap = Gesture.Tap().onStart(() => {
    react.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    jump.value = withSequence(
      withTiming(0.8, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 280, easing: Easing.out(Easing.exp) })
    );
  });

  const flowerSolid = '#FFDC61';

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.canvasWrap}>
        <Canvas style={{ width: size, height: size }}>
          <Rect x={0} y={0} width={size} height={size}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={[theme.backgroundSecondary, withAlpha('#FF7DAF', 0.18)]}
            />
          </Rect>

          <Circle
            cx={cx}
            cy={headY as any}
            r={haloRadius as any}
            color={withAlpha('#FF7DAF', 1)}
            opacity={haloOpacity as any}
          >
            <Blur blur={20} />
          </Circle>

          <Circle cx={cx} cy={headY as any} r={bodyRadius as any} color="#000000" />
          <Circle cx={leftEarX as any} cy={earY as any} r={earRadius as any} color="#000000" />
          <Circle cx={rightEarX as any} cy={earY as any} r={earRadius as any} color="#000000" />
          <Circle cx={leftFootX as any} cy={footY as any} r={footRadius as any} color="#000000" />
          <Circle cx={rightFootX as any} cy={footY as any} r={footRadius as any} color="#000000" />

          <Circle cx={leftEyeWhiteX as any} cy={eyeWhiteY as any} r={size * 0.064} color="#FFFFFF" />
          <Circle cx={rightEyeWhiteX as any} cy={eyeWhiteY as any} r={size * 0.064} color="#FFFFFF" />
          <Circle cx={leftEyeBlackX as any} cy={eyeBlackY as any} r={pupilRadius as any} color="#000000" />
          <Circle cx={rightEyeBlackX as any} cy={eyeBlackY as any} r={pupilRadius as any} color="#000000" />
          <Circle cx={leftPupilX as any} cy={pupilY as any} r={size * 0.0065} color="#FFFFFF" />
          <Circle cx={rightPupilX as any} cy={pupilY as any} r={size * 0.0065} color="#FFFFFF" />

          <Path path={leftBrowPath} color="#000000" style="stroke" strokeWidth={size * 0.052} strokeCap="round" />
          <Path path={rightBrowPath} color="#000000" style="stroke" strokeWidth={size * 0.052} strokeCap="round" />

          <Path
            path={mouthPath}
            color="#FFFFFF"
            style="stroke"
            strokeWidth={size * 0.025}
            strokeCap="round"
          />

          <Circle cx={flowerX1 as any} cy={flowerY1 as any} r={flowerPetalRadius} color={flowerSolid} />
          <Circle cx={flowerX2 as any} cy={flowerY2 as any} r={flowerPetalRadius} color={flowerSolid} />
          <Circle cx={flowerX3 as any} cy={flowerY3 as any} r={flowerPetalRadius} color={flowerSolid} />
          <Circle cx={flowerX4 as any} cy={flowerY4 as any} r={flowerPetalRadius} color={flowerSolid} />
          <Circle cx={flowerX5 as any} cy={flowerY5 as any} r={flowerPetalRadius} color={flowerSolid} />
          <Circle cx={cx} cy={flowerY0 as any} r={size * 0.012} color="#F6B500" />

        </Canvas>
      </View>
    </GestureDetector>
  );
}

export default function CharacterLabScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [mood, setMood] = useState(3);
  const [jumpSignal, setJumpSignal] = useState(0);
  const [reactSignal, setReactSignal] = useState(0);
  const [spinSignal, setSpinSignal] = useState(0);

  const moodLabel = useMemo(() => {
    if (mood <= 2) return 'Bright';
    if (mood === 3) return 'Neutral';
    return 'Sleepy';
  }, [mood]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text variant="title">Character Lab</Text>
          <Text variant="body" color={theme.textSecondary}>
            New Skia character rig. Tap the canvas to trigger a quick react.
          </Text>

          <Card style={styles.card}>
            <Text variant="bodyMedium">Primary Rig</Text>
            <CharacterPrototype
              mood={mood}
              jumpSignal={jumpSignal}
              reactSignal={reactSignal}
              spinSignal={spinSignal}
            />
          </Card>

          <Card style={styles.card}>
            <Text variant="bodyMedium">Heavy Body Pulse</Text>
            <Text variant="caption" color={theme.textTertiary}>
              Body breathes deep while face sizing stays stable.
            </Text>
            <CharacterPrototype
              mood={mood}
              jumpSignal={jumpSignal}
              reactSignal={reactSignal}
              spinSignal={spinSignal}
              heavyBodyPulse
            />
          </Card>

          <Card style={styles.card}>
            <Text variant="bodyMedium">State Controls</Text>
            <View style={styles.controls}>
              <Pressable
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={() => setMood((m) => Math.max(1, m - 1))}
              >
                <Text variant="small">Happier</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={() => setMood((m) => Math.min(5, m + 1))}
              >
                <Text variant="small">Sadder</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={() => setJumpSignal((v) => v + 1)}
              >
                <Text variant="small">Jump</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={() => setReactSignal((v) => v + 1)}
              >
                <Text variant="small">React</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={() => setSpinSignal((v) => v + 1)}
              >
                <Text variant="small">Spin</Text>
              </Pressable>
            </View>
            <Text variant="caption" color={theme.textTertiary}>
              mood: {mood} ({moodLabel})
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              1 = happiest, 5 = saddest
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  controlButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
