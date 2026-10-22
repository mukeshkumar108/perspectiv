import { StyleSheet, View } from 'react-native';
import { brand } from './tokens';
import { useTheme } from './useTheme';

/** A stable pseudo-random list of bar heights (0.25 to 1) from a seed, so a lesson always has the same shape. */
export function waveHeights(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const out: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < count; i += 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const r = (h % 1000) / 1000;
    prev = prev * 0.45 + r * 0.55; // smoothed, so it reads as speech and not static
    out.push(0.25 + 0.75 * Math.min(1, Math.max(0, prev * 1.25)));
  }
  return out;
}

/** Bars that fill with the accent colour as playback moves along: the shape of the audio, not a plain line. */
export function Waveform({ seed, progress = 0, height = 36, count = 34, activeColor = brand.accent, idleColor }: { seed: string; progress?: number; height?: number; count?: number; activeColor?: string; idleColor?: string }) {
  const theme = useTheme();
  const heights = waveHeights(seed, count);
  const idle = idleColor ?? theme.border;
  return (
    <View style={[styles.row, { height }]}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.bar, { height: Math.max(4, h * height), backgroundColor: (i + 0.5) / count <= progress ? activeColor : idle }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  bar: { flex: 1, borderRadius: 2 },
});
