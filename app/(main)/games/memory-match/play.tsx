import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Coffee, Heart, Leaf, Moon, Star, Sun } from 'lucide-react-native';
import Animated, { Easing, FadeIn, FadeOut, interpolate, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Pressable } from 'react-native';
import { Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { CountdownOverlay, GameShell, ResultScreen, useGameRun } from '@/src/games/kit';
import { addMemoryMatchSession, listMemoryMatchHistory } from '@/src/games/memoryMatch/storage';

const SYMBOLS = [
  { Icon: Heart, color: '#FF7DAF', soft: '#FFE0EC' },
  { Icon: Star, color: '#E7A91A', soft: '#FFF1C9' },
  { Icon: Moon, color: '#6E7BE8', soft: '#E1E5FF' },
  { Icon: Sun, color: '#F28C28', soft: '#FFE6CC' },
  { Icon: Leaf, color: '#2FB67C', soft: '#D9F5E7' },
  { Icon: Coffee, color: '#8B5E3C', soft: '#EADCCF' },
] as const;

type CardItem = { id: number; symbol: number; matched: boolean };

function dealBoard(): CardItem[] {
  const deck = SYMBOLS.flatMap((_, symbol) => [symbol, symbol]);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((symbol, id) => ({ id, symbol, matched: false }));
}

function Card({ card, faceUp, size, onPress }: { card: CardItem; faceUp: boolean; size: { w: number; h: number }; onPress: () => void }) {
  const theme = useTheme();
  const flip = useSharedValue(0);
  const pulse = useSharedValue(1);
  const sym = SYMBOLS[card.symbol];

  useEffect(() => {
    flip.value = withTiming(faceUp ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [faceUp, flip]);
  useEffect(() => {
    if (card.matched) pulse.value = withSequence(withTiming(1.1, { duration: 130 }), withTiming(1, { duration: 220 }));
  }, [card.matched, pulse]);

  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }, { scale: pulse.value }] }));
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }, { scale: pulse.value }] }));

  return (
    <Pressable onPress={onPress} style={{ width: size.w, height: size.h }} accessibilityRole="button" accessibilityLabel={faceUp ? 'Card face up' : 'Card face down'}>
      <Animated.View style={[styles.face, { backgroundColor: theme.text }, styles.hidden, back]}>
        <View style={styles.pip} />
      </Animated.View>
      <Animated.View style={[styles.face, styles.hidden, { backgroundColor: sym.soft, borderColor: card.matched ? sym.color : 'transparent', borderWidth: 2 }, front]}>
        <sym.Icon size={Math.round(size.w * 0.42)} color={sym.color} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

export default function MemoryMatchPlay() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ duration?: string }>();
  const durationSec = params.duration === '60' ? 60 : 30;
  const accent = sessionAccents.daytime;

  const { phase, count, timeLeftMs, restart } = useGameRun(durationSec);
  const [board, setBoard] = useState<CardItem[]>(dealBoard);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const savedRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    timers.current.forEach(clearTimeout);
    setBoard(dealBoard());
    setRevealed([]);
    setBusy(false);
    setScore(0);
    setCombo(0);
    setMatches(0);
    setMoves(0);
    setCleared(0);
    savedRef.current = false;
  }, [phase]);

  const tap = (card: CardItem) => {
    if (phase !== 'playing' || busy || card.matched || revealed.includes(card.id)) return;
    void Haptics.selectionAsync();
    const next = [...revealed, card.id];
    setRevealed(next);
    if (next.length < 2) return;

    setBusy(true);
    setMoves((m) => m + 1);
    const [a, b] = next.map((id) => board.find((c) => c.id === id)!);
    if (a.symbol === b.symbol) {
      later(() => {
        const nextBoard = board.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c));
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMatches((m) => m + 1);
        setScore((s) => s + 20 + Math.min(20, nextCombo * 4));
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setBoard(nextBoard);
        setRevealed([]);
        if (nextBoard.every((c) => c.matched)) {
          setScore((s) => s + 30);
          setCleared((n) => n + 1);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          later(() => {
            setBoard(dealBoard());
            setBusy(false);
          }, 800);
        } else {
          setBusy(false);
        }
      }, 300);
    } else {
      setCombo(0);
      setScore((s) => Math.max(0, s - 4));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      later(() => {
        setRevealed([]);
        setBusy(false);
      }, 700);
    }
  };

  useEffect(() => {
    if (phase !== 'results' || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const history = await listMemoryMatchHistory();
      setPreviousBest(history.length ? Math.max(...history.map((h) => h.score)) : null);
      await addMemoryMatchSession({ durationSec, score, matches, moves });
    })();
  }, [phase, durationSec, score, matches, moves]);

  if (phase === 'results') {
    const efficiency = moves > 0 ? Math.round((matches / moves) * 100) : 0;
    return (
      <ResultScreen
        title="Memory Match"
        accent={accent}
        score={score}
        previousBest={previousBest}
        stats={[
          { label: 'Pairs found', value: String(matches) },
          { label: 'Moves', value: String(moves) },
          { label: 'Efficiency', value: `${efficiency}%` },
          { label: 'Boards cleared', value: String(cleared) },
        ]}
        onAgain={restart}
      />
    );
  }

  const cols = 3;
  const gap = spacing.sm + 2;
  const cardW = area.w > 0 ? Math.floor((area.w - gap * (cols - 1)) / cols) : 0;
  const cardH = cardW > 0 ? Math.min(Math.floor(cardW * 1.12), Math.floor((area.h - gap * 3) / 4)) : 0;
  const size = { w: cardW, h: cardH };

  return (
    <GameShell accent={accent.base} score={score} timeLeftMs={timeLeftMs} durationMs={durationSec * 1000} showHud={phase === 'playing'}>
      <View style={styles.wrap}>
        <View style={styles.status}>
          {combo >= 2 ? (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[styles.combo, { backgroundColor: accent.soft }]}>
              <Text variant="small" medium>
                Combo ×{combo}
              </Text>
            </Animated.View>
          ) : (
            <Text variant="small" color={theme.textTertiary}>
              Find the pairs
            </Text>
          )}
        </View>
        <View style={styles.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {cardW > 0 ? (
            <View style={[styles.grid, { gap }]}>
              {board.map((card) => (
                <Card key={card.id} card={card} faceUp={card.matched || revealed.includes(card.id)} size={size} onPress={() => tap(card)} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
      {phase === 'countdown' ? <CountdownOverlay count={count} accent={accent.base} hint="Find the matching pairs" /> : null}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  status: { height: 36, alignItems: 'center', justifyContent: 'center' },
  combo: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  area: { flex: 1, paddingBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  face: { ...StyleSheet.absoluteFill, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hidden: { backfaceVisibility: 'hidden' },
  pip: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF7DAF' },
});
