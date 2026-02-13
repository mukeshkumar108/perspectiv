import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CharacterAnimated } from './CharacterAnimated';
import { CharacterErrorBoundary } from './CharacterErrorBoundary';
import type { CharacterProps } from './types';

const SVG_WIDTH = 601;
const SVG_HEIGHT = 553;
const ASPECT_RATIO = SVG_WIDTH / SVG_HEIGHT;
const VISIBLE_RATIO = 0.42;

function useReducedMotionEnabled() {
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReducedMotionEnabled(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setReducedMotionEnabled(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotionEnabled
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotionEnabled;
}

export function Character({
  state = 'idle',
  alignment = 'right',
  mood = null,
  accentKey = 0,
  sizeScale = 1,
  liftScale = 0,
  visibleRatio = VISIBLE_RATIO,
}: CharacterProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const reducedMotionEnabled = useReducedMotionEnabled();
  const shouldReduceMotion = reducedMotionEnabled || state !== 'idle';
  const layout = useMemo(() => {
    // Keep top bleed so flower/head never clip during upward motion.
    const baseVisibleHeight = Math.max(248, screenHeight * 0.38);
    const targetVisibleHeight = Math.round(Math.max(180, baseVisibleHeight * sizeScale));
    const topBleed = 60;
    // Add horizontal bleed so side edges never clip during intro motion/scale.
    const horizontalBleed = Math.round(screenWidth * 0.18);
    const viewportHeight = targetVisibleHeight + topBleed;
    const viewportWidth = screenWidth + horizontalBleed * 2;
    const frameHeight = Math.round(targetVisibleHeight / visibleRatio);
    const frameWidth = Math.round(frameHeight * ASPECT_RATIO);
    const liftPx = Math.round(screenHeight * liftScale);
    const bottomOffset = -(frameHeight - targetVisibleHeight) + liftPx;
    const centeredLeft = (screenWidth - frameWidth) / 2;
    const rightShift = Math.round(screenWidth * 0.243);
    const baseLeft = alignment === 'center' ? centeredLeft : centeredLeft + rightShift;
    const left = baseLeft + horizontalBleed;
    return { viewportHeight, viewportWidth, frameHeight, frameWidth, bottomOffset, left, horizontalBleed };
  }, [alignment, liftScale, screenHeight, screenWidth, sizeScale, visibleRatio]);

  return (
    <View
      style={[
        styles.viewport,
        {
          height: layout.viewportHeight,
          width: layout.viewportWidth,
          marginLeft: -layout.horizontalBleed,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.characterLayer,
          {
            width: layout.frameWidth,
            height: layout.frameHeight,
            bottom: layout.bottomOffset,
            left: layout.left,
          },
        ]}
      >
        <CharacterErrorBoundary>
          <CharacterAnimated
            reducedMotion={shouldReduceMotion}
            mood={mood}
            accentKey={accentKey}
          />
        </CharacterErrorBoundary>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    overflow: 'hidden',
  },
  characterLayer: {
    position: 'absolute',
    bottom: 0,
  },
});
