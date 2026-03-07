import { GamePregame } from '@/src/games/GamePregame';
import { useStroopBloomHistory } from '@/src/games/stroopBloom/storage';

export default function StroopBloomPregameScreen() {
  const recent = useStroopBloomHistory(4);
  const recentLines = recent.map((item) => `${item.score} pts • ${item.incongruentAccuracy}% incongruent • ${item.durationSec}s`);

  return (
    <GamePregame
      title="Stroop Bloom"
      subtitle="A color-word challenge where your brain has to ignore the wrong visual cue."
      whyItHelps={[
        'This trains mental control when two signals conflict.',
        'When anxious, stressed, or tired, incongruent trials usually get slower.',
        'It helps track how well you can override automatic reactions.',
      ]}
      whatItMeasures={[
        'Cognitive inhibition (ignoring misleading cues)',
        'Reaction speed in conflict conditions',
        'Stroop cost: how much slower incongruent trials are',
      ]}
      howToPlay={[
        'Read the color word in the center bubble.',
        'Tap the button matching the word meaning.',
        'Ignore the bubble color and respond quickly.',
      ]}
      playPath="/(main)/games/stroop-bloom/play"
      recentLines={recentLines}
    />
  );
}
