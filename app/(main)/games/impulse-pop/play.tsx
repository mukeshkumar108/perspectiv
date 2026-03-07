import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { COLOR_MAP, type BubbleEntity, type BurstEntity } from '@/src/games/impulsePop/model';
import { useImpulsePop } from '@/src/games/impulsePop/useImpulsePop';
import { addImpulsePopSession } from '@/src/games/impulsePop/storage';

function BubbleNode({
  bubble,
  onPress,
}: {
  bubble: BubbleEntity;
  onPress: () => void;
}) {
  const pulse = useSharedValue(0);
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [appear, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: (0.2 + appear.value * 0.8) * (1 + pulse.value * 0.04) }],
  }));

  return (
    <Animated.View
      style={[
        styles.bubbleWrap,
        {
          left: bubble.x - bubble.size / 2,
          top: bubble.y - bubble.size / 2,
          width: bubble.size,
          height: bubble.size,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.bubble,
          {
            backgroundColor: COLOR_MAP[bubble.color],
            borderRadius: bubble.size / 2,
          },
        ]}
      >
        <View style={styles.bubbleInner} />
      </Pressable>
    </Animated.View>
  );
}

function BurstNode({ burst }: { burst: BurstEntity }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.5 + progress.value * 1.6 }],
  }));

  const dotA = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: progress.value * 22 }, { translateY: -progress.value * 14 }],
  }));
  const dotB = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: -progress.value * 20 }, { translateY: -progress.value * 10 }],
  }));
  const dotC = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: progress.value * 14 }, { translateY: progress.value * 20 }],
  }));

  return (
    <View pointerEvents="none" style={[styles.burstWrap, { left: burst.x, top: burst.y }]}> 
      <Animated.View style={[styles.burstRing, { borderColor: COLOR_MAP[burst.color] }, ringStyle]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, dotA]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, dotB]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, dotC]} />
    </View>
  );
}

export default function ImpulsePopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string; autostart?: string }>();
  const theme = useTheme();
  const [arenaSize, setArenaSize] = useState({ width: 320, height: 460 });
  const savedRoundRef = useRef<number | null>(null);

  const {
    phase,
    countdown,
    timeLeftMs,
    bubbles,
    bursts,
    score,
    stats,
    selectedDurationSec,
    targetColor,
    targetLabel,
    onTapBubble,
    changeDuration,
    startSession,
    playAgain,
    roundEndedAt,
  } = useImpulsePop({ width: arenaSize.width, height: arenaSize.height, topInset: 76 });

  useEffect(() => {
    if (params.duration === '30' || params.duration === '60') {
      changeDuration(Number(params.duration) as 30 | 60);
    }
  }, [changeDuration, params.duration]);

  useEffect(() => {
    if (params.autostart === '1' && phase === 'idle') {
      startSession();
    }
  }, [params.autostart, phase, startSession]);

  useEffect(() => {
    if (phase !== 'results' || !roundEndedAt) return;
    if (savedRoundRef.current === roundEndedAt) return;
    savedRoundRef.current = roundEndedAt;
    void addImpulsePopSession({
      durationSec: selectedDurationSec,
      score: score.score,
      bestStreak: score.bestStreak,
      accuracy: stats.accuracy,
      reactionMedian: stats.reactionMedian,
    });
  }, [
    phase,
    roundEndedAt,
    score.bestStreak,
    score.score,
    selectedDurationSec,
    stats.accuracy,
    stats.reactionMedian,
  ]);

  const mmss = useMemo(() => {
    const total = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [timeLeftMs]);

  const onBubblePress = (bubble: BubbleEntity) => {
    onTapBubble(bubble);
    if (bubble.isTarget) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text variant="title">Impulse Pop</Text>
            <Text variant="small" color={theme.textSecondary}>
              Tap only {targetLabel}
            </Text>
            <View style={styles.targetChipRow}>
              <View
                style={[
                  styles.targetChip,
                  { backgroundColor: COLOR_MAP[targetColor], borderColor: 'rgba(255,255,255,0.7)' },
                ]}
              />
              <Text variant="caption" color={theme.textTertiary}>
                Target color
              </Text>
            </View>
          </View>
          <View style={styles.hudRight}>
            <Text variant="small" color={theme.textSecondary}>Time</Text>
            <Text variant="bodyMedium">{mmss}</Text>
          </View>
        </View>

        <View
          style={[styles.arena, { backgroundColor: theme.backgroundSecondary }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setArenaSize({ width, height });
          }}
        >
          <View style={styles.hudOverlay}>
            <Card style={styles.hudCard}>
              <Text variant="caption" color={theme.textTertiary}>Score</Text>
              <Text variant="bodyMedium">{score.score}</Text>
            </Card>
            <Card style={styles.hudCard}>
              <Text variant="caption" color={theme.textTertiary}>Streak</Text>
              <Text variant="bodyMedium">{score.streak}</Text>
            </Card>
          </View>

          {phase === 'playing'
            ? bubbles.map((bubble) => (
                <BubbleNode
                  key={bubble.id}
                  bubble={bubble}
                  onPress={() => onBubblePress(bubble)}
                />
              ))
            : null}

          {bursts.map((burst) => (
            <BurstNode key={burst.id} burst={burst} />
          ))}

          {phase !== 'playing' ? (
            <View style={styles.overlay}>
              {phase === 'countdown' ? (
                <>
                  <Text variant="hero">{countdown}</Text>
                  <Text variant="body" color={theme.textSecondary}>
                    Get ready
                  </Text>
                </>
              ) : phase === 'results' ? (
                <Card style={styles.resultCard}>
                  <Text variant="title">Round complete</Text>
                  <Text variant="hero">{score.score}</Text>
                  <Text variant="small" color={theme.textSecondary}>Accuracy {stats.accuracy}%</Text>
                  <Text variant="small" color={theme.textSecondary}>Best streak {score.bestStreak}</Text>
                  <Text variant="small" color={theme.textSecondary}>Median reaction {stats.reactionMedian} ms</Text>
                  <View style={styles.resultButtons}>
                    <Button title="Play again" onPress={playAgain} />
                    <Button title="Back to games" variant="secondary" onPress={() => router.back()} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.startCard}>
                  <Text variant="small" color={theme.textSecondary}>
                    Tap only the target color bubbles. Ignore decoys and build streaks.
                  </Text>
                  <Text variant="bodyMedium">Choose round length</Text>
                  <View style={styles.modePills}>
                    <Pressable
                      onPress={() => changeDuration(30)}
                      style={[
                        styles.modePill,
                        {
                          borderColor:
                            selectedDurationSec === 30 ? theme.text : theme.border,
                          backgroundColor:
                            selectedDurationSec === 30
                              ? theme.text
                              : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        color={selectedDurationSec === 30 ? theme.surface : theme.text}
                      >
                        30s
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => changeDuration(60)}
                      style={[
                        styles.modePill,
                        {
                          borderColor:
                            selectedDurationSec === 60 ? theme.text : theme.border,
                          backgroundColor:
                            selectedDurationSec === 60
                              ? theme.text
                              : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        color={selectedDurationSec === 60 ? theme.surface : theme.text}
                      >
                        60s
                      </Text>
                    </Pressable>
                  </View>
                  <Button title="Start" onPress={startSession} />
                </Card>
              )}
            </View>
          ) : null}
        </View>

        <Text variant="caption" color={theme.textTertiary}>
          Target color: {targetLabel} • Wrong taps are penalized.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  targetChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  targetChip: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  arena: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  hudOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  bubbleWrap: {
    position: 'absolute',
    zIndex: 10,
  },
  bubble: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  bubbleInner: {
    width: '42%',
    height: '42%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.33)',
  },
  burstWrap: {
    position: 'absolute',
    width: 1,
    height: 1,
    zIndex: 15,
  },
  burstRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    borderRadius: 999,
    borderWidth: 2,
  },
  burstDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    padding: spacing.md,
    backgroundColor: 'rgba(25,21,18,0.18)',
  },
  startCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
  },
  modePills: {
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
  },
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
