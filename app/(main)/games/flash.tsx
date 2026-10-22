import { GamePregame } from '@/src/games/GamePregame';
import { useFlashHistory } from '@/src/games/flash/storage';

export default function FlashPregameScreen() {
  const recent = useFlashHistory(4);
  const recentLines = recent.map((item) => `${item.score} pts • ${item.reactionMedian} ms median • ${item.falseStarts} early`);

  return (
    <GamePregame
      title="Flash"
      subtitle="Eight rounds. Wait for the circle to turn green, then tap as fast as you can."
      hideLength
      whyItHelps={[
        'Reaction time is one of the simplest ways to see how alert you are.',
        'It tends to slow when you are tired, stressed or distracted, and sharpen when you are rested.',
        'A quick daily read shows your own pattern over time.',
      ]}
      whatItMeasures={[
        'Simple reaction time, in milliseconds',
        'Consistency from round to round',
        'Impulse control: tapping before the signal counts against you',
      ]}
      howToPlay={[
        'Keep your thumb ready and wait.',
        'When the circle turns green, tap anywhere.',
        'Tap early and the round starts again.',
      ]}
      playPath="/(main)/games/flash/play"
      recentLines={recentLines}
    />
  );
}
