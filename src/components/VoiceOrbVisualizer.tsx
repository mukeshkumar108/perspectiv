import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

type Props = {
  state: VoiceOrbState;
};

type DotSpec = {
  key: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
};

type StateVisualParams = {
  outerRadiusNorm: number;
  innerRadiusNorm: number;
  outerDot: number;
  innerDot: number;
  twistDeg: number;
  twistMs: number;
  holdMs: number;
  swapMs: number;
  swapDepth: number;
  pulsePx: number;
  pulseHz: number;
  lobeAmp: number;
  lobeCount: number;
  lobeCoupling: number;
  innerAlpha: number;
};

type AnimState = StateVisualParams & {
  stateMs: number;
};

const TWO_PI = Math.PI * 2;
const OUTER_COUNT = 14;
const INNER_COUNT = 14;

const STATE_PARAMS: Record<VoiceOrbState, StateVisualParams> = {
  idle: {
    outerRadiusNorm: 0.35,
    innerRadiusNorm: 0.23,
    outerDot: 10.2,
    innerDot: 8.9,
    twistDeg: 4,
    twistMs: 1150,
    holdMs: 1500,
    swapMs: 980,
    swapDepth: 0.06,
    pulsePx: 1.6,
    pulseHz: 0.16,
    lobeAmp: 0,
    lobeCount: 6,
    lobeCoupling: 0,
    innerAlpha: 0.88,
  },
  listening: {
    outerRadiusNorm: 0.35,
    innerRadiusNorm: 0.23,
    outerDot: 10.5,
    innerDot: 9.1,
    twistDeg: 7,
    twistMs: 900,
    holdMs: 980,
    swapMs: 820,
    swapDepth: 0.08,
    pulsePx: 1.9,
    pulseHz: 0.38,
    lobeAmp: 0.012,
    lobeCount: 6,
    lobeCoupling: 0.08,
    innerAlpha: 0.9,
  },
  recording: {
    outerRadiusNorm: 0.35,
    innerRadiusNorm: 0.23,
    outerDot: 11.2,
    innerDot: 9.8,
    twistDeg: 30,
    twistMs: 460,
    holdMs: 240,
    swapMs: 430,
    swapDepth: 0.32,
    pulsePx: 4.8,
    pulseHz: 2.05,
    lobeAmp: 0.05,
    lobeCount: 7,
    lobeCoupling: 0.52,
    innerAlpha: 0.9,
  },
  thinking: {
    outerRadiusNorm: 0.31,
    innerRadiusNorm: 0.19,
    outerDot: 11,
    innerDot: 9.5,
    twistDeg: 42,
    twistMs: 540,
    holdMs: 460,
    swapMs: 560,
    swapDepth: 1,
    pulsePx: 0,
    pulseHz: 0.2,
    lobeAmp: 0,
    lobeCount: 6,
    lobeCoupling: 0,
    innerAlpha: 0.92,
  },
  pre_speaking: {
    outerRadiusNorm: 0.33,
    innerRadiusNorm: 0.21,
    outerDot: 11.8,
    innerDot: 10.3,
    twistDeg: 48,
    twistMs: 340,
    holdMs: 180,
    swapMs: 340,
    swapDepth: 0.85,
    pulsePx: 6.2,
    pulseHz: 2.9,
    lobeAmp: 0.07,
    lobeCount: 7,
    lobeCoupling: 0.72,
    innerAlpha: 0.93,
  },
  speaking: {
    outerRadiusNorm: 0.34,
    innerRadiusNorm: 0.22,
    outerDot: 10.8,
    innerDot: 9.4,
    twistDeg: 11,
    twistMs: 720,
    holdMs: 520,
    swapMs: 640,
    swapDepth: 0.1,
    pulsePx: 2.9,
    pulseHz: 0.92,
    lobeAmp: 0.045,
    lobeCount: 6,
    lobeCoupling: 0.14,
    innerAlpha: 0.9,
  },
};

function withAlpha(hex: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}

function lerp(from: number, to: number, factor: number) {
  return from + (to - from) * factor;
}

function easeInOutCubic(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

function easeOutQuint(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 5);
}

function getChoreography(params: {
  timeMs: number;
  twistDeg: number;
  twistMs: number;
  holdMs: number;
  swapMs: number;
}) {
  const twist = Math.max(1, params.twistMs);
  const hold = Math.max(0, params.holdMs);
  const swap = Math.max(1, params.swapMs);
  const total = twist + hold + swap + hold + twist + hold + swap + hold;
  const local = ((params.timeMs % total) + total) % total;

  const t1End = twist;
  const h1End = t1End + hold;
  const s1End = h1End + swap;
  const h2End = s1End + hold;
  const t2End = h2End + twist;
  const h3End = t2End + hold;
  const s2End = h3End + swap;

  const theta = (params.twistDeg * Math.PI) / 180;
  let angle = 0;
  let swapMix = 0;

  if (local < t1End) {
    const p = easeInOutCubic(local / twist);
    angle = theta * p;
  } else if (local < h1End) {
    angle = theta;
  } else if (local < s1End) {
    const p = easeInOutCubic((local - h1End) / swap);
    angle = theta;
    swapMix = p;
  } else if (local < h2End) {
    angle = theta;
    swapMix = 1;
  } else if (local < t2End) {
    const p = easeInOutCubic((local - h2End) / twist);
    angle = theta * (1 - p);
    swapMix = 1;
  } else if (local < h3End) {
    angle = 0;
    swapMix = 1;
  } else if (local < s2End) {
    const p = easeInOutCubic((local - h3End) / swap);
    angle = 0;
    swapMix = 1 - p;
  } else {
    angle = 0;
    swapMix = 0;
  }

  return {
    outerAngle: angle,
    innerAngle: -angle,
    swapMix,
  };
}

function getIdleHeartbeatAccent(timeMs: number) {
  const beatMs = 860;
  const cycleMs = beatMs * 4;
  const local = ((timeMs % cycleMs) + cycleMs) % cycleMs;
  const finalBeatStart = beatMs * 3;

  if (local < finalBeatStart) {
    return 0;
  }

  const t = local - finalBeatStart;
  const attackMs = beatMs * 0.08;
  const holdMs = beatMs * 0.92;
  const releaseMs = beatMs * 0.58;

  if (t < attackMs) {
    return easeOutQuint(t / attackMs);
  }
  if (t < attackMs + holdMs) {
    return 1;
  }
  if (t < attackMs + holdMs + releaseMs) {
    const p = (t - attackMs - holdMs) / releaseMs;
    return 1 - easeInOutCubic(p);
  }
  return 0;
}

function getIdleOuterPullAccent(timeMs: number) {
  const beatMs = 860;
  const cycleMs = beatMs * 4;
  const local = ((timeMs % cycleMs) + cycleMs) % cycleMs;
  const finalBeatStart = beatMs * 3;
  const pullStart = finalBeatStart + beatMs * 0.14;
  let eventTime = local;
  if (eventTime < pullStart) {
    eventTime += cycleMs;
  }

  const t = eventTime - pullStart;
  const attackMs = beatMs * 0.06;
  const holdMs = beatMs * 1.0;
  const settleMs = beatMs * 0.58;

  if (t < 0) return 0;
  if (t < attackMs) {
    return easeOutQuint(t / attackMs);
  }
  if (t < attackMs + holdMs) {
    return 1;
  }
  if (t < attackMs + holdMs + settleMs) {
    const p = (t - attackMs - holdMs) / settleMs;
    return 1 - easeInOutCubic(p);
  }
  return 0;
}

function buildRingLayer(params: {
  keyPrefix: string;
  center: number;
  count: number;
  radius: number;
  angleBase: number;
  phaseOffsetSteps: number;
  dotRadius: number;
  color: string;
  lobeAmp: number;
  lobeCount: number;
  lobePhase: number;
}) {
  const dots: DotSpec[] = [];
  const count = Math.max(4, params.count);
  const step = TWO_PI / count;
  const offset = step * params.phaseOffsetSteps;

  for (let index = 0; index < count; index += 1) {
    const local = index * step + offset;
    const angle = params.angleBase + local;
    const radialScale =
      1 + params.lobeAmp * Math.sin(params.lobeCount * local + params.lobePhase);
    const radial = params.radius * radialScale;

    dots.push({
      key: `${params.keyPrefix}-${index}`,
      cx: params.center + Math.cos(angle) * radial,
      cy: params.center + Math.sin(angle) * radial,
      r: params.dotRadius,
      color: params.color,
    });
  }

  return dots;
}

export function VoiceOrbVisualizer({ state }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.max(320, Math.min(width - spacing.xs * 2, 460));
  const center = size * 0.5;

  const [, setFrameTick] = useState(0);
  const animRef = useRef<AnimState>({
    ...STATE_PARAMS.idle,
    stateMs: 0,
  });
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    animRef.current.stateMs = 0;
  }, [state]);

  useEffect(() => {
    let raf: number | null = null;

    const frame = (ts: number) => {
      const prev = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - prev) / 1000));
      const smooth = 1 - Math.exp(-dt * 8.5);

      const target = STATE_PARAMS[state];
      const anim = animRef.current;

      anim.outerRadiusNorm = lerp(anim.outerRadiusNorm, target.outerRadiusNorm, smooth);
      anim.innerRadiusNorm = lerp(anim.innerRadiusNorm, target.innerRadiusNorm, smooth);
      anim.outerDot = lerp(anim.outerDot, target.outerDot, smooth);
      anim.innerDot = lerp(anim.innerDot, target.innerDot, smooth);
      anim.twistDeg = lerp(anim.twistDeg, target.twistDeg, smooth);
      anim.twistMs = lerp(anim.twistMs, target.twistMs, smooth);
      anim.holdMs = lerp(anim.holdMs, target.holdMs, smooth);
      anim.swapMs = lerp(anim.swapMs, target.swapMs, smooth);
      anim.swapDepth = lerp(anim.swapDepth, target.swapDepth, smooth);
      anim.pulsePx = lerp(anim.pulsePx, target.pulsePx, smooth);
      anim.pulseHz = lerp(anim.pulseHz, target.pulseHz, smooth);
      anim.lobeAmp = lerp(anim.lobeAmp, target.lobeAmp, smooth);
      anim.lobeCount = lerp(anim.lobeCount, target.lobeCount, smooth);
      anim.lobeCoupling = lerp(anim.lobeCoupling, target.lobeCoupling, smooth);
      anim.innerAlpha = lerp(anim.innerAlpha, target.innerAlpha, smooth);

      anim.stateMs += dt * 1000;

      setFrameTick((v) => (v + 1) % 100000);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      lastTsRef.current = null;
    };
  }, [state]);

  const anim = animRef.current;
  const choreography = getChoreography({
    timeMs: anim.stateMs,
    twistDeg: anim.twistDeg,
    twistMs: anim.twistMs,
    holdMs: anim.holdMs,
    swapMs: anim.swapMs,
  });

  const basePulse =
    Math.sin((anim.stateMs / 1000) * TWO_PI * anim.pulseHz) * anim.pulsePx;
  const isHeartbeatState = state === 'idle' || state === 'listening';
  const heartbeatScale = state === 'idle' ? 1 : 0.78;
  const idleHeartbeatPulse =
    isHeartbeatState
      ? getIdleHeartbeatAccent(anim.stateMs) * (size * 0.038) * heartbeatScale
      : 0;
  const pulse = basePulse + idleHeartbeatPulse;
  const idleSeparationKick =
    isHeartbeatState ? getIdleOuterPullAccent(anim.stateMs) * heartbeatScale : 0;
  const idleOuterPull = idleSeparationKick * (size * 0.088);
  const idleInnerPull = idleSeparationKick * (size * 0.071);
  const outerBase = size * anim.outerRadiusNorm + pulse + idleOuterPull;
  const innerBase = size * anim.innerRadiusNorm - pulse * 0.45 - idleInnerPull;

  const swappedOuterTarget = lerp(outerBase, innerBase, anim.swapDepth);
  const swappedInnerTarget = lerp(innerBase, outerBase, anim.swapDepth);

  let outerRadius = lerp(outerBase, swappedOuterTarget, choreography.swapMix);
  let innerRadius = lerp(innerBase, swappedInnerTarget, choreography.swapMix);

  if (state === 'idle' && idleSeparationKick > 0) {
    const currentSeparation = Math.max(8, outerRadius - innerRadius);
    const boostedSeparation =
      currentSeparation * (1 + 0.85 * idleSeparationKick);
    const separationDelta = boostedSeparation - currentSeparation;
    outerRadius += separationDelta * 0.62;
    innerRadius -= separationDelta * 0.38;
  }

  const lobePhaseOuter = choreography.outerAngle * anim.lobeCoupling;
  const lobePhaseInner = choreography.innerAngle * anim.lobeCoupling + Math.PI / 6;

  const colors = {
    outer: theme.text,
    inner: withAlpha(theme.text, anim.innerAlpha),
    core: withAlpha(theme.text, 0.7),
  };

  const outerDots = buildRingLayer({
    keyPrefix: 'outer',
    center,
    count: OUTER_COUNT,
    radius: Math.max(24, outerRadius),
    angleBase: choreography.outerAngle,
    phaseOffsetSteps: 0,
    dotRadius: anim.outerDot,
    color: colors.outer,
    lobeAmp: anim.lobeAmp,
    lobeCount: anim.lobeCount,
    lobePhase: lobePhaseOuter,
  });

  const innerDots = buildRingLayer({
    keyPrefix: 'inner',
    center,
    count: INNER_COUNT,
    radius: Math.max(24, innerRadius),
    angleBase: choreography.innerAngle,
    phaseOffsetSteps: 0.5,
    dotRadius: anim.innerDot,
    color: colors.inner,
    lobeAmp: anim.lobeAmp * 0.78,
    lobeCount: anim.lobeCount,
    lobePhase: lobePhaseInner,
  });

  return (
    <View style={styles.wrap}>
      <Canvas style={{ width: size, height: size }}>
        {innerDots.map((dot) => (
          <Circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} color={dot.color} />
        ))}
        {outerDots.map((dot) => (
          <Circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} color={dot.color} />
        ))}
        <Circle cx={center} cy={center} r={Math.max(4.2, anim.innerDot * 0.56)} color={colors.core} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
