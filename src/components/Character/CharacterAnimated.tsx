import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Extrapolation,
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BREATH_DURATION = 7000;
const BLINK_DURATION = 11000;

const BREATH_EASING = Easing.bezier(0.37, 0, 0.63, 1);
const BLINK_EASING = Easing.bezier(0.4, 0, 0.2, 1);

interface CharacterAnimatedProps {
  reducedMotion: boolean;
  mood?: number | null;
  accentKey?: number;
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function interpolateKeyframes(progress: number, keyframes: number[], values: number[]) {
  'worklet';
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    if (progress >= keyframes[i] && progress <= keyframes[i + 1]) {
      const segmentProgress =
        (progress - keyframes[i]) / (keyframes[i + 1] - keyframes[i]);
      return values[i] + (values[i + 1] - values[i]) * segmentProgress;
    }
  }
  return values[values.length - 1];
}

export function CharacterAnimated({
  reducedMotion,
  mood = null,
  accentKey = 0,
}: CharacterAnimatedProps) {
  const breathProgress = useSharedValue(0);
  const blinkProgress = useSharedValue(0);
  const driftProgress = useSharedValue(0);
  const moodProgress = useSharedValue(2);
  const accentProgress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      breathProgress.value = 0;
      blinkProgress.value = 0;
      driftProgress.value = 0;
      return;
    }

    breathProgress.value = withRepeat(
      withTiming(1, { duration: BREATH_DURATION, easing: BREATH_EASING }),
      -1,
      false
    );
    
    blinkProgress.value = withRepeat(
      withTiming(1, { duration: BLINK_DURATION, easing: BLINK_EASING }),
      -1,
      false
    );
    driftProgress.value = withRepeat(
      withTiming(1, { duration: 19000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [reducedMotion, breathProgress, blinkProgress, driftProgress]);

  useEffect(() => {
    const nextMood = mood == null ? 2 : Math.max(0, Math.min(4, mood - 1));
    moodProgress.value = withSpring(nextMood, {
      damping: 14,
      stiffness: 170,
    });
  }, [mood, moodProgress]);

  useEffect(() => {
    if (reducedMotion || accentKey <= 0) return;
    accentProgress.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
    );
  }, [accentKey, accentProgress, reducedMotion]);

  const breathStyle = useAnimatedStyle(() => {
    const scaleY = interpolate(
      breathProgress.value,
      [0, 0.28, 0.35, 0.82, 1],
      [1, 1.018, 1.018, 0.997, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      breathProgress.value,
      [0, 0.28, 0.35, 0.82, 1],
      [0, -3, -3, 0.5, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY: translateY - accentProgress.value * 4 },
        { scaleY: scaleY + accentProgress.value * 0.02 },
      ],
    };
  });

  const leftEyeAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const blinkSquash = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.895, 0.925, 0.935, 0.945, 1],
      [1, 1, 0.4, 1.03, 1, 1]
    );
    const moodOpen = interpolate(
      moodVisual,
      [0, 2, 4],
      [0.9, 1, 1.08],
      Extrapolation.CLAMP
    );
    return { ry: 17.5 * blinkSquash * moodOpen };
  });

  const rightEyeAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const blinkSquash = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.895, 0.925, 0.935, 0.945, 1],
      [1, 1, 0.4, 1.03, 1, 1]
    );
    const moodOpen = interpolate(
      moodVisual,
      [0, 2, 4],
      [0.9, 1, 1.08],
      Extrapolation.CLAMP
    );
    return { ry: 17.5 * blinkSquash * moodOpen };
  });

  const leftPupilAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const opacity = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.905, 0.91, 0.935, 0.94, 1],
      [1, 1, 0, 0, 1, 1]
    );
    const driftX = interpolateKeyframes(
      driftProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0.6, -0.4, 0.4, 0]
    );
    const driftY = interpolateKeyframes(
      driftProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, -0.4, 0.6, 0.4, 0]
    );
    const moodY = interpolate(moodVisual, [0, 2, 4], [2, 0, -1], Extrapolation.CLAMP);
    return {
      cx: 287 + driftX,
      cy: 100 + driftY + moodY,
      opacity,
    };
  });

  const rightPupilAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const opacity = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.905, 0.91, 0.935, 0.94, 1],
      [1, 1, 0, 0, 1, 1]
    );
    const driftX = interpolateKeyframes(
      driftProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0.6, -0.4, 0.4, 0]
    );
    const driftY = interpolateKeyframes(
      driftProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, -0.4, 0.6, 0.4, 0]
    );
    const moodY = interpolate(moodVisual, [0, 2, 4], [2, 0, -1], Extrapolation.CLAMP);
    return {
      cx: 306 - driftX,
      cy: 100 + driftY + moodY,
      opacity,
    };
  });

  const leftBrowAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const blinkY = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.895, 0.91, 0.925, 0.94, 0.955, 1],
      [0, 0, -9, 32, -5, 0, 0]
    );
    const moodY = interpolate(moodVisual, [0, 2, 4], [8, 0, -4], Extrapolation.CLAMP);
    return {
      y1: 117 + moodY + blinkY,
      y2: 63 + moodY + blinkY,
    };
  });

  const rightBrowAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const blinkY = interpolateKeyframes(
      blinkProgress.value,
      [0, 0.895, 0.91, 0.925, 0.94, 0.955, 1],
      [0, 0, -9, 32, -5, 0, 0]
    );
    const moodY = interpolate(moodVisual, [0, 2, 4], [8, 0, -4], Extrapolation.CLAMP);
    return {
      y1: 102 + moodY + blinkY,
      y2: 67 + moodY + blinkY,
    };
  });

  const mouthAnimatedProps = useAnimatedProps(() => {
    const moodVisual = 4 - moodProgress.value;
    const bend = interpolate(moodVisual, [0, 2, 4], [-18, 0, 20], Extrapolation.CLAMP);
    const widthScale = interpolate(moodVisual, [0, 2, 4], [1.2, 1, 1.2], Extrapolation.CLAMP);
    const halfWidth = 21.5 * widthScale;
    const leftX = 307.5 - halfWidth;
    const rightX = 307.5 + halfWidth;
    const baselineY = 186 - bend * 0.1;
    const controlY = 186 - bend;
    return {
      d: `M${leftX} ${baselineY} Q307.5 ${controlY} ${rightX} ${baselineY}`,
    };
  });

  return (
    <Animated.View style={[styles.container, breathStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 601 553" fill="none">
        <Defs>
          <RadialGradient id="bodyGradient" cx="50%" cy="35%">
            <Stop offset="0%" stopColor="#0A0A0A" />
            <Stop offset="100%" stopColor="#000000" />
          </RadialGradient>
          <ClipPath id="eyeClip">
            <Circle cx="263.5" cy="116.5" r="38.5" />
            <Circle cx="330.5" cy="116.5" r="38.5" />
          </ClipPath>
        </Defs>

        <Circle cx="296.5" cy="266.5" r="266.5" fill="url(#bodyGradient)" />
        
        <Circle cx="38.5" cy="243.5" r="38.5" fill="#000000" />
        <Circle cx="562.5" cy="243.5" r="38.5" fill="#000000" />
        <Circle cx="240.5" cy="514.5" r="38.5" fill="#000000" />
        <Circle cx="335.5" cy="514.5" r="38.5" fill="#000000" />

        <Circle cx="263.5" cy="116.5" r="38.5" fill="#FFFFFF" />
        <Circle cx="330.5" cy="116.5" r="38.5" fill="#FFFFFF" />

        <G clipPath="url(#eyeClip)">
          <AnimatedEllipse
            animatedProps={leftEyeAnimatedProps}
            cx="282"
            cy="99.5"
            rx="17"
            ry="17.5"
            fill="#000000"
          />
          <AnimatedCircle
            animatedProps={leftPupilAnimatedProps}
            r="4"
            fill="#FFFFFF"
          />
          <AnimatedEllipse
            animatedProps={rightEyeAnimatedProps}
            cx="312"
            cy="99.5"
            rx="17"
            ry="17.5"
            fill="#000000"
          />
          <AnimatedCircle
            animatedProps={rightPupilAnimatedProps}
            r="4"
            fill="#FFFFFF"
          />
        </G>

        <AnimatedLine
          animatedProps={leftBrowAnimatedProps}
          x1="198"
          x2="283"
          stroke="#000000"
          strokeWidth="35"
          strokeLinecap="round"
        />
        <AnimatedLine
          animatedProps={rightBrowAnimatedProps}
          x1="388"
          x2="316"
          stroke="#000000"
          strokeWidth="35"
          strokeLinecap="round"
        />

        <AnimatedPath
          animatedProps={mouthAnimatedProps}
          stroke="#FFFFFF"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        <G transform="translate(0 -4)">
          <Path d="M302.7 30L313.3 76C315.8 87 306.9 97 295.7 96C284.2 95 277.1 83 282.1 72L302.7 30Z" fill="#FFDC61" />
          <Path d="M316.5 43L275 68C265.4 73 253 68 250.4 57C247.8 46 257.2 36 268.7 37L316.5 43Z" fill="#FFDC61" />
          <Path d="M307.5 60L271.2 29C262.8 22 264 9 273.6 3C283.6 -2 296.4 3 298.6 14L307.5 60Z" fill="#FFDC61" />
          <Path d="M288.2 57L307.2 14C311.7 4 324.8 1 333.3 8C342.1 15 340.6 29 330.5 35L288.2 57Z" fill="#FFDC61" />
          <Path d="M285.2 38L333.2 43C344.4 44 351.3 55 347 65C342.5 76 328.7 79 320.3 71L285.2 38Z" fill="#FFDC61" />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
