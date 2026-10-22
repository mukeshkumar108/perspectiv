import { useEffect, useRef, useState, type RefObject } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

import type { VoiceOrbState } from '@/src/voice/sessionLogic';
import { brand } from '@/src/ui/tokens';

type Props = {
  state: VoiceOrbState;
  /** 0..1 live level of whatever is audible (mic while listening, voice while speaking). */
  levelRef?: RefObject<number>;
};

/**
 * Black, coral and grey on the app's pale background.
 * Arriving: a small core blooms in and soft coral rings ripple out, slowly, like a held breath.
 * Thinking: nearly silent. A coral comet circles the core, trailing off into grey.
 * You speaking: dots drift inward along a star of spokes and gather.
 * Her speaking: dots stream outward along the star, shrinking and fading as they go, and follow her voice.
 */

const SPOKES = 12;
const DOTS = 5;
const TRAIL = 9;
const RINGS = 3;
const TWO_PI = Math.PI * 2;

type Look = {
  scale: number; // reach of the star
  spokeAlpha: number;
  flow: number; // dots per second along a spoke; negative flows inward
  core: number; // core size multiplier
  ripple: number; // rings rippling out from the core
  comet: number; // the thinking comet
  levelGain: number;
};

const LOOK: Record<VoiceOrbState, Look> = {
  idle: { scale: 0.5, spokeAlpha: 0, flow: 0.05, core: 0.9, ripple: 1, comet: 0, levelGain: 0 },
  thinking: { scale: 0.58, spokeAlpha: 0, flow: 0.05, core: 0.75, ripple: 0, comet: 1, levelGain: 0 },
  listening: { scale: 0.8, spokeAlpha: 0.6, flow: -0.2, core: 1.05, ripple: 0, comet: 0, levelGain: 0.9 },
  recording: { scale: 0.8, spokeAlpha: 0.6, flow: -0.2, core: 1.05, ripple: 0, comet: 0, levelGain: 0.9 },
  pre_speaking: { scale: 0.9, spokeAlpha: 0.8, flow: 0.28, core: 1.1, ripple: 0, comet: 0, levelGain: 1 },
  speaking: { scale: 1, spokeAlpha: 1, flow: 0.3, core: 1.1, ripple: 0, comet: 0, levelGain: 1 },
};

function withAlpha(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fract = (x: number) => x - Math.floor(x);
/** Overshoots slightly, then settles: how the core arrives. */
const easeOutBack = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

type Anim = Look & { phase: number; time: number; level: number; enter: number };

export function VoiceOrb({ state, levelRef }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.max(280, Math.min(width - 32, 400));
  const center = size / 2;

  const [, setTick] = useState(0);
  const anim = useRef<Anim>({ ...LOOK.idle, phase: 0, time: 0, level: 0, enter: 0 }).current;
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
      anim.ripple = lerp(anim.ripple, target.ripple, k);
      anim.comet = lerp(anim.comet, target.comet, k);
      anim.levelGain = lerp(anim.levelGain, target.levelGain, k);

      // Fast attack, slow release: the star jumps with a syllable and settles after it.
      const raw = state === 'listening' || state === 'recording' || state === 'speaking' || state === 'pre_speaking' ? (levelRef?.current ?? 0) : 0;
      anim.level = lerp(anim.level, raw, 1 - Math.exp(-dt * (raw > anim.level ? 20 : 6)));

      anim.time += dt;
      anim.enter = Math.min(1, anim.enter + dt / 1.1);
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

  const { ink, pink, grey } = { ink: brand.ink, pink: brand.accent, grey: brand.grey };
  const lvl = anim.level * anim.levelGain;
  const arrive = easeOutBack(anim.enter);

  const coreR = (size * 0.05 * anim.core * (1 + 0.05 * Math.sin(anim.time * 1.6)) + lvl * size * 0.018) * arrive;
  const reach = size * 0.46 * anim.scale * (1 + lvl * 0.32);
  const maxDot = size * 0.021;

  const dots: { key: string; x: number; y: number; r: number; c: string }[] = [];
  const rings: { key: string; r: number; c: string }[] = [];

  // Spokes: long spokes carry the colour of whoever is speaking (coral for her, ink for you), short ones are grey.
  if (anim.spokeAlpha > 0.01) {
    const drift = anim.time * 0.06;
    const speaking = anim.flow > 0;
    for (let i = 0; i < SPOKES; i += 1) {
      const angle = (i / SPOKES) * TWO_PI + drift;
      const long = i % 2 === 0;
      const length = long ? 1 : 0.68;
      const color = long ? (speaking ? pink : ink) : grey;
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

  // Arriving: soft coral rings ripple out and fade.
  if (anim.ripple > 0.01) {
    for (let i = 0; i < RINGS; i += 1) {
      const p = fract(anim.time * 0.36 + i / RINGS);
      rings.push({
        key: `rp${i}`,
        r: coreR * 2.2 + p * size * 0.24,
        c: withAlpha(pink, anim.ripple * Math.pow(1 - p, 1.6) * 0.55 * Math.min(1, anim.enter * 1.5)),
      });
    }
  }

  // Thinking: a pink comet with a grey tail, and a faint counter-rotating ring.
  if (anim.comet > 0.01) {
    const orbitR = size * 0.105;
    const head = anim.time * 2.1;
    for (let i = 0; i < TRAIL; i += 1) {
      const a = head - i * 0.2;
      const f = 1 - i / TRAIL;
      dots.push({
        key: `cm${i}`,
        x: center + Math.cos(a) * orbitR,
        y: center + Math.sin(a) * orbitR,
        r: size * 0.012 * (0.35 + 0.65 * f),
        c: withAlpha(i === 0 ? pink : i < 3 ? pink : grey, anim.comet * Math.pow(f, 1.3)),
      });
    }
    for (let i = 0; i < 12; i += 1) {
      const a = -anim.time * 0.35 + (i / 12) * TWO_PI;
      dots.push({ key: `tr${i}`, x: center + Math.cos(a) * orbitR * 1.55, y: center + Math.sin(a) * orbitR * 1.55, r: size * 0.0055, c: withAlpha(grey, anim.comet * 0.5) });
    }
  }

  return (
    <View style={styles.wrap}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={center} cy={center} r={coreR * 2.6 + lvl * size * 0.045} color={withAlpha(pink, 0.1 + lvl * 0.14)} />
        {rings.map((ring) => (
          <Circle key={ring.key} cx={center} cy={center} r={ring.r} style="stroke" strokeWidth={1.4} color={ring.c} />
        ))}
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
