import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3, Flame, Trophy, X } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Button, Card, ScreenContainer, SurfaceGradient, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { addMemoryMatchSession } from '@/src/games/memoryMatch/storage';

type CardItem = {
  id: string;
  emoji: string;
  label: string;
  pairId: string;
  matched: boolean;
};

const EMOJI_POOL = [
  { emoji: '🌤️', label: 'SUN' },
  { emoji: '🌧️', label: 'RAIN' },
  { emoji: '🌈', label: 'RAINBOW' },
  { emoji: '🌙', label: 'MOON' },
  { emoji: '⭐', label: 'STAR' },
  { emoji: '🔥', label: 'FIRE' },
  { emoji: '🍀', label: 'LUCK' },
  { emoji: '🌊', label: 'WAVE' },
  { emoji: '🫧', label: 'BUBBLE' },
  { emoji: '🎈', label: 'BALLOON' },
] as const;

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function makeDeck() {
  const selected = shuffle(EMOJI_POOL).slice(0, 6);
  const pairs = selected.flatMap((entry, index) => {
    const pairId = `pair_${index}`;
    return [
      { id: `${pairId}_a`, emoji: entry.emoji, label: entry.label, pairId, matched: false },
      { id: `${pairId}_b`, emoji: entry.emoji, label: entry.label, pairId, matched: false },
    ] as CardItem[];
  });
  return shuffle(pairs);
}

function FlipCard({
  item,
  isRevealed,
  isDisabled,
  onPress,
}: {
  item: CardItem;
  isRevealed: boolean;
  isDisabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = useSharedValue(isRevealed ? 1 : 0);
  const matchedPulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isRevealed ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isRevealed, progress]);

  useEffect(() => {
    if (!item.matched) return;
    matchedPulse.value = withSpring(1, { damping: 9, stiffness: 220 }, () => {
      matchedPulse.value = withTiming(0, { duration: 200 });
    });
  }, [item.matched, matchedPulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + matchedPulse.value * 0.1;
    const t = progress.value;
    const squeeze = t < 0.5 ? 1 - t * 0.16 : 0.92 + (t - 0.5) * 0.16;
    return {
      transform: [
        { scale: squeeze * scale },
      ],
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.5 ? 1 - t * 2 : 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.5 ? 0 : (t - 0.5) * 2,
    };
  });

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={styles.cardPress}>
      <Animated.View style={[styles.flipWrap, animatedStyle]}>
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            frontStyle,
          ]}
        >
          <View style={[styles.cardDot, { backgroundColor: 'rgba(255,125,175,0.26)' }]} />
        </Animated.View>
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              backgroundColor: item.matched ? '#FFD9E8' : '#FFEED8',
              borderColor: item.matched ? '#FF7DAF' : '#F0C58A',
            },
            backStyle,
          ]}
        >
          <RNText style={styles.emojiText}>{item.emoji}</RNText>
          <RNText style={styles.emojiLabel}>{item.label}</RNText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function MemoryMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string; autostart?: string }>();

  const [phase, setPhase] = useState<'idle' | 'countdown' | 'playing' | 'results'>('idle');
  const [selectedDurationSec, setSelectedDurationSec] = useState<30 | 60>(30);
  const [countdown, setCountdown] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(selectedDurationSec * 1000);
  const [deck, setDeck] = useState<CardItem[]>(() => makeDeck());
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [busy, setBusy] = useState(false);

  const startedAtRef = useRef(0);
  const durationMsRef = useRef(selectedDurationSec * 1000);
  const savedRef = useRef(false);

  useEffect(() => {
    if (params.duration === '30' || params.duration === '60') {
      const next = Number(params.duration) as 30 | 60;
      setSelectedDurationSec(next);
      setTimeLeftMs(next * 1000);
      durationMsRef.current = next * 1000;
    }
  }, [params.duration]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          startedAtRef.current = Date.now();
          setTimeLeftMs(durationMsRef.current);
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, durationMsRef.current - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setPhase('results');
      }
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (matches >= 6 && phase === 'playing') {
      setPhase('results');
    }
  }, [matches, phase]);

  useEffect(() => {
    if (phase !== 'results' || savedRef.current) return;
    savedRef.current = true;
    void addMemoryMatchSession({
      durationSec: selectedDurationSec,
      score,
      matches,
      moves,
    });
  }, [matches, moves, phase, score, selectedDurationSec]);

  const mmss = useMemo(() => {
    const total = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [timeLeftMs]);

  const handleStart = () => {
    savedRef.current = false;
    setDeck(makeDeck());
    setRevealedIds([]);
    setScore(0);
    setMatches(0);
    setMoves(0);
    setCombo(0);
    setBusy(false);
    durationMsRef.current = selectedDurationSec * 1000;
    setPhase('countdown');
  };

  const handleCardPress = (card: CardItem) => {
    if (phase !== 'playing' || busy || card.matched || revealedIds.includes(card.id)) return;
    const nextRevealed = [...revealedIds, card.id];
    setRevealedIds(nextRevealed);

    if (nextRevealed.length < 2) {
      void Haptics.selectionAsync();
      return;
    }

    const [firstId, secondId] = nextRevealed;
    const first = deck.find((item) => item.id === firstId);
    const second = deck.find((item) => item.id === secondId);
    if (!first || !second) return;

    setBusy(true);
    setMoves((prev) => prev + 1);

    if (first.pairId === second.pairId) {
      const nextCombo = combo + 1;
      const gained = 18 + Math.min(18, nextCombo * 4);
      setCombo(nextCombo);
      setScore((prev) => prev + gained);
      setMatches((prev) => prev + 1);
      setDeck((prev) =>
        prev.map((entry) => {
          if (entry.id === first.id || entry.id === second.id) {
            return { ...entry, matched: true };
          }
          return entry;
        })
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setRevealedIds([]);
        setBusy(false);
      }, 340);
      return;
    }

    setCombo(0);
    setScore((prev) => Math.max(0, prev - 6));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => {
      setRevealedIds([]);
      setBusy(false);
    }, 520);
  };

  const isRevealed = (card: CardItem) => revealedIds.includes(card.id) || card.matched;

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.topHud}>
          <View style={styles.hudInline}>
            <View style={styles.hudItem}>
              <Clock3 size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{mmss}</Text>
            </View>
            <View style={styles.hudItem}>
              <Trophy size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{score}</Text>
            </View>
            <View style={styles.hudItem}>
              <Flame size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>x{Math.max(1, combo)}</Text>
            </View>
            <View style={styles.hudItem}>
              <Text variant="caption" color="#675D86">Pairs</Text>
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{matches}/6</Text>
            </View>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeIconButton} hitSlop={12}>
            <X size={20} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>

        <View style={styles.gridWrap}>
          <SurfaceGradient
            startColor="#070A1D"
            endColor="#1D1142"
            glows={[
              { x: 0.12, y: 0.1, radius: 0.86, color: 'rgba(255,79,205,0.22)' },
              { x: 0.84, y: 0.9, radius: 0.92, color: 'rgba(60,226,255,0.2)' },
              { x: 0.8, y: 0.16, radius: 0.58, color: 'rgba(131,84,255,0.24)' },
            ]}
          />
          <View style={styles.grid}>
            {deck.map((card) => (
              <FlipCard
                key={card.id}
                item={card}
                isRevealed={isRevealed(card)}
                isDisabled={phase !== 'playing' || busy}
                onPress={() => handleCardPress(card)}
              />
            ))}
          </View>

          {phase !== 'playing' ? (
            <View style={styles.overlay}>
              {phase === 'countdown' ? (
                <>
                  <Text variant="hero" color="#FFFFFF">{countdown}</Text>
                  <Text variant="body" color="#D6CFFF">Get ready</Text>
                </>
              ) : phase === 'results' ? (
                <Card style={styles.resultCard}>
                  <Text variant="title" color="#1F1A2F">Round complete</Text>
                  <Text variant="hero" color="#171322">{score}</Text>
                  <Text variant="small" color="#5F557F">
                    {matches}/6 pairs • {moves} moves
                  </Text>
                  <View style={styles.resultActions}>
                    <Button title="Play again" onPress={handleStart} />
                    <Button title="Back to games" variant="secondary" onPress={() => router.back()} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.startCard}>
                  <Text variant="small" color="#5F557F">
                    Reveal two cards at a time and match pairs before time runs out.
                  </Text>
                  <Text variant="bodyMedium" color="#1F1A2F">Choose round length</Text>
                  <View style={styles.modeRow}>
                    <Pressable
                      onPress={() => setSelectedDurationSec(30)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 30 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor: selectedDurationSec === 30 ? '#1F1A2F' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 30 ? '#FFFFFF' : '#5F557F'}>
                        30s
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedDurationSec(60)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: selectedDurationSec === 60 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor: selectedDurationSec === 60 ? '#1F1A2F' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text variant="bodyMedium" color={selectedDurationSec === 60 ? '#FFFFFF' : '#5F557F'}>
                        60s
                      </Text>
                    </Pressable>
                  </View>
                  <Button title="Start" onPress={handleStart} />
                </Card>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  hudInline: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
    alignItems: 'center',
  },
  hudItem: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6CFEE',
    backgroundColor: '#F6F4FD',
    paddingHorizontal: spacing.sm,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudValue: {
    fontWeight: '700',
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#16131F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  gridWrap: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(178,151,255,0.5)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  cardPress: {
    width: '31.8%',
    aspectRatio: 1,
  },
  flipWrap: {
    flex: 1,
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
  },
  cardFront: {},
  cardBack: {},
  emojiText: {
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  emojiLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#231E15',
    textAlign: 'center',
  },
  cardDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(17,13,34,0.22)',
    padding: spacing.md,
  },
  startCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modePill: {
    minWidth: 66,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
