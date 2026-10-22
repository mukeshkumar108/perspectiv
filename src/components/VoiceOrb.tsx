import { useEffect, useRef, useState, type RefObject } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { useTheme } from '@/src/ui/useTheme';

type Props = {
  state: VoiceOrbState;
  /** 0..1 live level of whatever is audible (mic while listening, voice while speaking). */
  levelRef?: RefObject<number>;
};

/**
 * A small, calm core that wakes up as the conversation does. While she speaks, dots stream outward along a star of spokes and
 * shrink and fade as they travel; while you speak they drift inward and gather; while she thinks it is quiet and small.
 */

const SPOKES = 12;
const DOTS = 5;
const TWO_PI = Math.PI * 2;

type Look = {
  scale: number; // overall reach of the star
  spokeAlpha: number;
  flow: number; // dots per second along a spoke; negative flows inward
  core: number; // core size multiplier
  orbit: number; // alpha of the slow thinking dots
  ring: number; // alpha of the resting ring
  levelGain: number;
};

const LOOK: Record<VoiceOrbState, Look> = {
  idle: { scale: 0.5, spokeAlpha: 0, flow: 0.05, core: 0.9, orbit: 0, ring: 0.4, levelGain: 0 },
  thinking: { scale: 0.58, spokeAlpha: 0, flow: 0.05, core: 0.8, orbit: 0.55, ring: 0.12, levelGain: 0 },
  listening: { scale: 0.8, spokeAlpha: 0.55, flow: -0.2, core: 1.05, orbit: 0, ring: 0, levelGain: 0.9 },
  recording: { scale: 0.8, spokeAlpha: 0.55, flow: -0.2, core: 1.05, orbit: 0, ring: 0, levelGain: 0.9 },
  pre_speaking: { scale: 0.9, spokeAlpha: 0.8, flow: 0.28, core: 1.1, orbit: 0, ring: 0, levelGain: 1 },
  speaking: { scale: 1, spokeAlpha: 1, flow: 0.3, core: 1.1, orbit: 0, ring: 0, levelGain: 1 },
};

function withAlpha(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fract = (x: number) => x - Math.floor(x);

type Anim = Look & { phase: number; time: number; level: number };

export function VoiceOrb({ state, levelRef }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.max(280, Math.min(width - 32, 400));
  const center = size / 2;

  const [, setTick] = useState(0);
  const anim = useRef<Anim>({ ...LOOK.idle, phase: 0, time: 0, level: 0 }).current;
  const lastTs = useRef<number | null>(null);
  const lastRender = useRef(0);

  useEffect(() => {
    let raf: number | null = null;
    const frame = (ts: number) => {
      const prev = lastTs.current ?? ts;
      lastTs.current = ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - prev) / 1000));
      const k = 1 - Math.exp(-dt * 5);
      const target = LOOK[state];

      anim.scale = lerp(anim.scale, target.scale, k);
      anim.spokeAlpha = lerp(anim.spokeAlpha, target.spokeAlpha, k);
      anim.flow = lerp(anim.flow, target.flow, k);
      anim.core = lerp(anim.core, target.core, k);
      anim.orbit = lerp(anim.orbit, target.orbit, k);
      anim.ring = lerp(anim.ring, target.ring, k);
      anim.levelGain = lerp(anim.levelGain, target.levelGain, k);

      // Fast attack, slow release: the star jumps with a syllable and settles after it.
      const raw = state === 'listening' || state === 'recording' || state === 'speaking' || state === 'pre_speaking' ? (levelRef?.current ?? 0) : 0;
      anim.level = lerp(anim.level, raw, 1 - Math.exp(-dt * (raw > anim.level ? 20 : 6)));

      anim.time += dt;
      anim.phase += dt * anim.flow * (1 + anim.level * 2.4 * anim.levelGain);

      if (ts - lastRender.current >= 30) {
        lastRender.current = ts;
        setTick((v) => (v + 1) % 100000);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      lastTs.current = null;
    };
  }, [state, levelRef, anim]);

  const ink = theme.text;
  const warm = theme.accent;
  const lvl = anim.level * anim.levelGain;

  const coreR = size * 0.05 * anim.core * (1 + 0.05 * Math.sin(anim.time * 1.6)) + lvl * size * 0.018;
  const reach = size * 0.46 * anim.scale * (1 + lvl * 0.32);
  const maxDot = size * 0.021;

  const dots: { key: string; x: number; y: number; r: number; c: string }[] = [];

  if (anim.spokeAlpha > 0.01) {
    const drift = anim.time * 0.06;
    for (let i = 0; i < SPOKES; i += 1) {
      const angle = (i / SPOKES) * TWO_PI + drift;
      const length = i % 2 === 0 ? 1 : 0.68; // alternate long and short spokes: a star, not a wheel
      const color = i % 2 === 0 ? ink : warm;
      for (let j = 0; j < DOTS; j += 1) {
        const p = fract(anim.phase + j / DOTS + i * 0.037);
        const radius = coreR * 1.7 + p * (reach * length - coreR * 1.7);
        const fadeIn = Math.min(1, p / 0.08, (1 - p) / 0.12 + 0.2);
        const alpha = anim.spokeAlpha * Math.pow(1 - p, 1.1) * Math.min(1, fadeIn);
        const r = maxDot * Math.pow(1 - p, 0.85) + 1;
        if (alpha < 0.02) continue;
        dots.push({
          key: `s${i}-${j}`,
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius,
          r,
          c: withAlpha(color, alpha),
        });
      }
    }
  }

  if (anim.ring > 0.01) {
    const ringR = size * 0.1 * (1 + 0.04 * Math.sin(anim.time * 1.1));
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TWO_PI + anim.time * 0.08;
      dots.push({ key: `ring${i}`, x: center + Math.cos(a) * ringR, y: center + Math.sin(a) * ringR, r: size * 0.008, c: withAlpha(ink, anim.ring) });
    }
  }

  if (anim.orbit > 0.01) {
    const orbitR = size * 0.1;
    for (let i = 0; i < 3; i += 1) {
      const a = anim.time * 0.9 + (i / 3) * TWO_PI;
      dots.push({ key: `orb${i}`, x: center + Math.cos(a) * orbitR, y: center + Math.sin(a) * orbitR, r: size * (0.011 - i * 0.002), c: withAlpha(warm, anim.orbit * (1 - i * 0.28)) });
    }
  }

  return (
    <View style={styles.wrap}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={center} cy={center} r={coreR * 2.6 + lvl * size * 0.04} color={withAlpha(warm, 0.1 + lvl * 0.1)} />
        {dots.map((d) => (
          <Circle key={d.key} cx={d.x} cy={d.y} r={d.r} color={d.c} />
        ))}
        <Circle cx={center} cy={center} r={coreR} color={ink} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
});
