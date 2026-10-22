import Svg, { Circle } from 'react-native-svg';
import { brand } from '@/src/ui/tokens';

const SPOKES = 8;
const DOTS = 3;

/**
 * The Bluum mark: a dark core with a star of dots that shrink as they leave it. The same shape the voice orb makes
 * when it speaks, so the logo and the character are one thing.
 */
export function BluumMark({ size = 40, core = brand.ink, accent = brand.accent, soft = brand.grey }: { size?: number; core?: string; accent?: string; soft?: string }) {
  const c = 50;
  const dots: { x: number; y: number; r: number; fill: string }[] = [];
  for (let i = 0; i < SPOKES; i += 1) {
    const angle = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    for (let j = 0; j < DOTS; j += 1) {
      const t = (j + 1) / DOTS;
      const radius = 17 + t * (long ? 27 : 19);
      dots.push({ x: c + Math.cos(angle) * radius, y: c + Math.sin(angle) * radius, r: (long ? 4.6 : 3.6) * (1 - t * 0.55), fill: long ? accent : soft });
    }
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} />
      ))}
      <Circle cx={c} cy={c} r={11} fill={core} />
    </Svg>
  );
}
