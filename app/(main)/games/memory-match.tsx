import { GamePregame } from '@/src/games/GamePregame';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';

export default function MemoryMatchPregameScreen() {
  const recent = useMemoryMatchHistory(4);
  const recentLines = recent.map((item) => `${item.score} pts • ${item.matches}/6 pairs • ${item.durationSec}s`);

  return (
    <GamePregame
      title="Memory Match"
      subtitle="Flip cards, remember positions, and complete pairs before time runs out."
      whyItHelps={[
        'This game trains short-term visual memory and concentration.',
        'When focus drops, people usually need more moves and extra time.',
        'Repeated sessions help show whether your recall is improving.',
      ]}
      whatItMeasures={[
        'Working memory for visual locations',
        'Attention consistency across the round',
        'Speed vs accuracy balance',
      ]}
      howToPlay={[
        'Tap a card to reveal it, then tap a second card.',
        'If they match, the pair stays open.',
        'If not, remember positions and try again quickly.',
      ]}
      playPath="/(main)/games/memory-match/play"
      recentLines={recentLines}
    />
  );
}
