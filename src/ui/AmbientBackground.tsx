import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from './useTheme';

interface AmbientBackgroundProps {
  intensity?: number;
}

function withAlpha(hex: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}

let Skia: any = null;
try {
  Skia = require('@shopify/react-native-skia');
} catch {
  Skia = null;
}

function StaticAmbientBackground({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { Canvas, Rect, LinearGradient, RadialGradient, vec } = Skia;
  const baseColors = useMemo(
    () => [theme.background, theme.backgroundSecondary],
    [theme]
  );
  const glowWarm = withAlpha(theme.accentLight, 0.42 * intensity);
  const glowSoft = withAlpha(theme.surface, 0.3 * intensity);
  const radius = Math.max(width, height) * 0.75;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={baseColors}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.25, height * 0.2)}
          r={radius}
          colors={[glowWarm, 'transparent']}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.78, height * 0.86)}
          r={radius * 0.75}
          colors={[glowSoft, 'transparent']}
        />
      </Rect>
    </Canvas>
  );
}

function AnimatedAmbientBackground({ intensity }: { intensity: number }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const {
    Canvas,
    Rect,
    LinearGradient,
    RadialGradient,
    vec,
    useValue,
    useComputedValue,
    runTiming,
  } = Skia;
  const progress = useValue(0);

  useEffect(() => {
    runTiming(progress, 1, { duration: 14000, loop: true, yoyo: true });
  }, [progress]);

  const glow1Center = useComputedValue(
    () => vec(width * (0.2 + 0.6 * progress.current), height * 0.2),
    [progress, width, height]
  );
  const glow2Center = useComputedValue(
    () => vec(width * (0.8 - 0.5 * progress.current), height * 0.85),
    [progress, width, height]
  );

  const baseColors = useMemo(
    () => [theme.background, theme.backgroundSecondary],
    [theme]
  );

  const glowWarm = withAlpha(theme.accentLight, 0.42 * intensity);
  const glowSoft = withAlpha(theme.surface, 0.3 * intensity);

  const radius = Math.max(width, height) * 0.75;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={baseColors}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={glow1Center} r={radius} colors={[glowWarm, 'transparent']} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={glow2Center} r={radius * 0.75} colors={[glowSoft, 'transparent']} />
      </Rect>
    </Canvas>
  );
}

export function AmbientBackground({ intensity = 1 }: AmbientBackgroundProps) {
  if (!Skia) {
    return null;
  }
  const hasAnimation =
    typeof Skia.useValue === 'function' &&
    typeof Skia.useComputedValue === 'function' &&
    typeof Skia.runTiming === 'function';

  if (!hasAnimation) {
    return <StaticAmbientBackground intensity={intensity} />;
  }

  return <AnimatedAmbientBackground intensity={intensity} />;
}
