import { GamePregame } from '@/src/games/GamePregame';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';

export default function ImpulsePopPregameScreen() {
  const recent = useImpulsePopHistory(4);
  const recentLines = recent.map((item) => `${item.score} pts • ${item.accuracy}% acc • ${item.durationSec}s`);

  return (
    <GamePregame
      title="Impulse Pop"
      subtitle="A quick focus game where you select only the target color under pressure."
      whyItHelps={[
        'This helps you train focus in noisy situations.',
        'When people are tired, overloaded, or anxious, wrong taps usually increase.',
        'Over time you can see whether attention control is stable or drifting.',
      ]}
      whatItMeasures={[
        'Selection accuracy under pressure',
        'Reaction speed to target cues',
        'Impulse control (avoiding decoys)',
      ]}
      howToPlay={[
        'Watch the target color shown at the top.',
        'Tap bubbles of that color only.',
        'Avoid decoy colors to keep your streak and score.',
      ]}
      playPath="/(main)/games/impulse-pop/play"
      recentLines={recentLines}
    />
  );
}
