import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import * as Skia from '@shopify/react-native-skia';

type GlowSpec = {
  x: number;
  y: number;
  radius: number;
  color: string;
};

type SurfaceGradientProps = {
  startColor: string;
  endColor: string;
  glows?: readonly GlowSpec[];
};

export function SurfaceGradient({ startColor, endColor, glows = [] }: SurfaceGradientProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { Canvas, Rect, LinearGradient, RadialGradient, vec } = Skia;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });
  };

  const ready = size.width > 0 && size.height > 0;
  const resolvedGlows = useMemo(() => {
    if (!ready) return [];
    return glows.map((glow) => ({
      color: glow.color,
      centerX: size.width * glow.x,
      centerY: size.height * glow.y,
      radius: Math.max(size.width, size.height) * glow.radius,
    }));
  }, [glows, ready, size.height, size.width]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={handleLayout}>
      {ready ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size.width} height={size.height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size.width, size.height)}
              colors={[startColor, endColor]}
            />
          </Rect>
          {resolvedGlows.map((glow, index) => (
            <Rect key={index} x={0} y={0} width={size.width} height={size.height}>
              <RadialGradient
                c={vec(glow.centerX, glow.centerY)}
                r={glow.radius}
                colors={[glow.color, 'transparent']}
              />
            </Rect>
          ))}
        </Canvas>
      ) : null}
    </View>
  );
}
