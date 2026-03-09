import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Audio } from 'expo-av';
import { Clock3, Flame, Trophy, X } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Button, Card, ScreenContainer, SurfaceGradient, Text, spacing } from '@/src/ui';
import { COLOR_MAP, type BubbleEntity, type BurstEntity } from '@/src/games/impulsePop/model';
import { useImpulsePop } from '@/src/games/impulsePop/useImpulsePop';
import { addImpulsePopSession } from '@/src/games/impulsePop/storage';

type FeedbackPopup = {
  id: string;
  x: number;
  y: number;
  label: string;
  createdAt: number;
  positive: boolean;
};

const NEON_BUBBLE_TINT: Record<string, { glow: string; rim: string; core: string; deep: string }> = {
  gold: { glow: 'rgba(255,220,64,0.48)', rim: 'rgba(255,250,205,0.96)', core: '#FFD11A', deep: '#F6A300' },
  coral: { glow: 'rgba(255,77,167,0.5)', rim: 'rgba(255,221,240,0.96)', core: '#FF3D7A', deep: '#D61D59' },
  mint: { glow: 'rgba(36,255,185,0.46)', rim: 'rgba(216,255,238,0.96)', core: '#00D08A', deep: '#02A66F' },
  sky: { glow: 'rgba(68,205,255,0.48)', rim: 'rgba(220,245,255,0.96)', core: '#24B3FF', deep: '#0A86D8' },
};

function BubbleNode({
  bubble,
  onPress,
}: {
  bubble: BubbleEntity;
  onPress: () => void;
}) {
  const pulse = useSharedValue(0);
  const appear = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    const driftDuration = 920 + (bubble.size % 5) * 110;
    drift.value = withDelay(
      (bubble.size % 7) * 40,
      withRepeat(
        withSequence(
          withTiming(1, { duration: driftDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: driftDuration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [appear, bubble.size, drift, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: -2.6 * drift.value },
      { scale: (0.2 + appear.value * 0.8) * (1 + pulse.value * 0.08) },
    ],
  }));
  const tint = NEON_BUBBLE_TINT[bubble.color] ?? NEON_BUBBLE_TINT.sky;

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
        style={({ pressed }) => [
          styles.bubble,
          pressed ? styles.bubblePressed : null,
          {
            backgroundColor: tint.core,
            borderRadius: bubble.size / 2,
            borderColor: tint.rim,
          },
        ]}
      >
        <View style={[styles.bubbleGlowOuter, { backgroundColor: tint.glow }]} />
        <View style={[styles.bubbleGlowInner, { backgroundColor: tint.glow }]} />
        <View style={[styles.bubbleDeepTone, { backgroundColor: tint.deep }]} />
        <View style={styles.bubbleGlossStrong} />
        <View style={styles.bubbleGlossSoft} />
        <View style={styles.bubbleSpec} />
      </Pressable>
    </Animated.View>
  );
}

function ComboPopup({ popup }: { popup: FeedbackPopup }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: -progress.value * 44 },
      { scale: 0.86 + (1 - progress.value) * 0.32 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.comboPopupWrap, { left: popup.x, top: popup.y }, style]}
    >
      <View style={[styles.comboPopup, popup.positive ? styles.comboPopupGood : styles.comboPopupBad]}>
        <Text variant="small" color={popup.positive ? '#11131F' : '#FFF3F9'}>
          {popup.label}
        </Text>
      </View>
    </Animated.View>
  );
}

function NeonTexture({ width, height }: { width: number; height: number }) {
  const dots = useMemo(() => {
    if (width <= 0 || height <= 0) return [];
    return Array.from({ length: 72 }, (_, i) => {
      const x = ((i * 67) % 101) / 100;
      const y = ((i * 53 + 19) % 103) / 102;
      const size = i % 9 === 0 ? 2.1 : 1.2;
      const warm = i % 3 === 0;
      return {
        id: i,
        left: x * width,
        top: y * height,
        size,
        color: warm ? 'rgba(255,130,231,0.16)' : 'rgba(112,213,255,0.14)',
      };
    });
  }, [height, width]);

  return (
    <View pointerEvents="none" style={styles.textureWrap}>
      {dots.map((dot) => (
        <View
          key={dot.id}
          style={[
            styles.textureDot,
            {
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              backgroundColor: dot.color,
            },
          ]}
        />
      ))}
      <View style={styles.scanlineA} />
      <View style={styles.scanlineB} />
    </View>
  );
}

function BurstNode({ burst }: { burst: BurstEntity }) {
  const progress = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) });
    spin.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.quad) });
  }, [progress, spin]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.45 + progress.value * 2.1 }],
  }));
  const ringSecondaryStyle = useAnimatedStyle(() => ({
    opacity: 0.9 - progress.value,
    transform: [{ scale: 0.2 + progress.value * 1.8 }],
  }));
  const shardA = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${spin.value * 160}deg` },
      { translateX: progress.value * 30 },
      { translateY: -progress.value * 16 },
    ],
  }));
  const shardB = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${-spin.value * 140}deg` },
      { translateX: -progress.value * 26 },
      { translateY: -progress.value * 12 },
    ],
  }));
  const shardC = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${spin.value * 120}deg` },
      { translateX: progress.value * 20 },
      { translateY: progress.value * 24 },
    ],
  }));
  const shardD = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${-spin.value * 110}deg` },
      { translateX: -progress.value * 16 },
      { translateY: progress.value * 18 },
    ],
  }));
  const shardE = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${spin.value * 180}deg` },
      { translateX: progress.value * 10 },
      { translateY: -progress.value * 28 },
    ],
  }));
  const shardF = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${-spin.value * 176}deg` },
      { translateX: -progress.value * 8 },
      { translateY: progress.value * 30 },
    ],
  }));

  return (
    <View pointerEvents="none" style={[styles.burstWrap, { left: burst.x, top: burst.y }]}>
      <Animated.View style={[styles.burstRing, { borderColor: COLOR_MAP[burst.color] }, ringStyle]} />
      <Animated.View
        style={[styles.burstRingSecondary, { borderColor: COLOR_MAP[burst.color] }, ringSecondaryStyle]}
      />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardA]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardB]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardC]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardD]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardE]} />
      <Animated.View style={[styles.burstDot, { backgroundColor: COLOR_MAP[burst.color] }, shardF]} />
      <Animated.View style={styles.burstCore} />
    </View>
  );
}

export default function ImpulsePopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string; autostart?: string }>();
  const [arenaSize, setArenaSize] = useState({ width: 320, height: 460 });
  const [popups, setPopups] = useState<FeedbackPopup[]>([]);
  const savedRoundRef = useRef<number | null>(null);
  const lastHapticAtRef = useRef(0);
  const correctComboRef = useRef(0);
  const hitSoundRef = useRef<Audio.Sound | null>(null);
  const missSoundRef = useRef<Audio.Sound | null>(null);
  const hitFlash = useSharedValue(0);
  const arenaPunch = useSharedValue(0);
  const arenaJoltX = useSharedValue(0);
  const [flashColor, setFlashColor] = useState('rgba(255,255,255,0.2)');

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
    let mounted = true;
    const loadSounds = async () => {
      const { Audio: AudioModule } = await import('expo-av');
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const [hitBundle, missBundle] = await Promise.all([
          AudioModule.Sound.createAsync(require('../../../../assets/sfx/pop-hit.wav'), { shouldPlay: false }),
          AudioModule.Sound.createAsync(require('../../../../assets/sfx/pop-miss.wav'), { shouldPlay: false }),
        ]);
        if (!mounted) {
          await hitBundle.sound.unloadAsync();
          await missBundle.sound.unloadAsync();
          return;
        }
        hitSoundRef.current = hitBundle.sound;
        missSoundRef.current = missBundle.sound;
      } catch {
        // SFX is optional; gameplay continues if audio is unavailable.
      }
    };
    loadSounds();

    return () => {
      mounted = false;
      const hit = hitSoundRef.current;
      const miss = missSoundRef.current;
      hitSoundRef.current = null;
      missSoundRef.current = null;
      if (hit) void hit.unloadAsync();
      if (miss) void miss.unloadAsync();
    };
  }, []);

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

  useEffect(() => {
    if (popups.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setPopups((prev) => prev.filter((item) => now - item.createdAt < 760));
    }, 120);
    return () => clearInterval(id);
  }, [popups.length]);

  const pushPopup = (x: number, y: number, label: string, positive: boolean) => {
    const now = Date.now();
    const item: FeedbackPopup = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      x,
      y,
      label,
      positive,
      createdAt: now,
    };
    setPopups((prev) => [...prev.slice(-8), item]);
  };

  const onBubblePress = (bubble: BubbleEntity) => {
    const now = Date.now();
    onTapBubble(bubble);
    if (bubble.isTarget) {
      correctComboRef.current += 1;
      if (correctComboRef.current >= 3 && (correctComboRef.current % 2 === 1 || correctComboRef.current % 5 === 0)) {
        pushPopup(
          bubble.x - 22,
          bubble.y - bubble.size * 0.55,
          `x${correctComboRef.current}`,
          true
        );
      }
      setFlashColor('rgba(255,250,190,0.5)');
      hitFlash.value = withSequence(
        withTiming(1, { duration: 48, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 190, easing: Easing.out(Easing.quad) })
      );
      arenaPunch.value = withSequence(
        withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) })
      );
      const feedback =
        correctComboRef.current % 10 === 0
          ? Haptics.ImpactFeedbackStyle.Heavy
          : correctComboRef.current % 5 === 0
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
      if (now - lastHapticAtRef.current > 36) {
        lastHapticAtRef.current = now;
        void Haptics.impactAsync(feedback);
      }
      const hit = hitSoundRef.current;
      if (hit) {
        void hit.setPositionAsync(0).then(() => hit.playAsync());
      }
    } else {
      pushPopup(bubble.x - 18, bubble.y - bubble.size * 0.55, 'MISS', false);
      correctComboRef.current = 0;
      setFlashColor('rgba(255,63,129,0.44)');
      hitFlash.value = withSequence(
        withTiming(1, { duration: 58, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) })
      );
      arenaJoltX.value = withSequence(
        withTiming(-6, { duration: 36 }),
        withTiming(5, { duration: 42 }),
        withTiming(-3, { duration: 34 }),
        withTiming(0, { duration: 28 })
      );
      if (now - lastHapticAtRef.current > 72) {
        lastHapticAtRef.current = now;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }
      const miss = missSoundRef.current;
      if (miss) {
        void miss.setPositionAsync(0).then(() => miss.playAsync());
      }
    }
  };

  const hitFlashStyle = useAnimatedStyle(() => ({
    opacity: hitFlash.value,
  }));
  const arenaKickStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: arenaJoltX.value },
      { scale: 1 + arenaPunch.value * 0.015 },
    ],
  }));

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
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{score.score}</Text>
            </View>
            <View style={styles.hudItem}>
              <Flame size={14} color="#5E547D" strokeWidth={2.3} />
              <Text variant="bodyMedium" color="#1F1A2F" style={styles.hudValue}>{score.streak}</Text>
            </View>
            <View
              style={[
                styles.targetCue,
                { backgroundColor: COLOR_MAP[targetColor], borderColor: 'rgba(255,255,255,0.95)' },
              ]}
            />
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeIconButton} hitSlop={12}>
            <X size={20} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>

        <Animated.View
          style={[styles.arena, arenaKickStyle]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setArenaSize({ width, height });
          }}
        >
          <SurfaceGradient
            startColor="#070A1D"
            endColor="#1D1142"
            glows={[
              { x: 0.14, y: 0.12, radius: 0.9, color: 'rgba(255,79,205,0.22)' },
              { x: 0.86, y: 0.9, radius: 0.92, color: 'rgba(60,226,255,0.2)' },
              { x: 0.82, y: 0.14, radius: 0.62, color: 'rgba(131,84,255,0.28)' },
              { x: 0.5, y: 0.56, radius: 1.1, color: 'rgba(73,120,255,0.1)' },
            ]}
          />
          <NeonTexture width={arenaSize.width} height={arenaSize.height} />

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

          {popups.map((popup) => (
            <ComboPopup key={popup.id} popup={popup} />
          ))}

          <Animated.View
            pointerEvents="none"
            style={[styles.hitFlash, hitFlashStyle, { backgroundColor: flashColor }]}
          />

          {phase !== 'playing' ? (
            <View style={styles.overlay}>
              {phase === 'countdown' ? (
                <>
                  <Text variant="hero" color="#FFFFFF">{countdown}</Text>
                  <Text variant="body" color="#D6CFFF">
                    Get ready
                  </Text>
                </>
              ) : phase === 'results' ? (
                <Card style={styles.resultCard}>
                  <Text variant="title" color="#1F1A2F">Round complete</Text>
                  <Text variant="hero" color="#171322">{score.score}</Text>
                  <Text variant="small" color="#5F557F">Accuracy {stats.accuracy}%</Text>
                  <Text variant="small" color="#5F557F">Best streak {score.bestStreak}</Text>
                  <Text variant="small" color="#5F557F">Median reaction {stats.reactionMedian} ms</Text>
                  <View style={styles.resultButtons}>
                    <Button title="Play again" onPress={playAgain} />
                    <Button title="Back to games" variant="secondary" onPress={() => router.back()} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.startCard}>
                  <Text variant="bodyMedium" color="#1F1A2F">Target bubble</Text>
                  <View style={styles.modalTargetRow}>
                    <View
                      style={[
                        styles.targetChip,
                        { backgroundColor: COLOR_MAP[targetColor], borderColor: 'rgba(255,255,255,0.92)' },
                      ]}
                    />
                    <Text variant="small" color="#5F557F">{targetLabel}</Text>
                  </View>
                  <Text variant="small" color="#5F557F">
                    Tap only this color. Wrong taps are penalized.
                  </Text>
                  <Text variant="bodyMedium" color="#1F1A2F">Choose round length</Text>
                  <View style={styles.modePills}>
                    <Pressable
                      onPress={() => changeDuration(30)}
                      style={[
                        styles.modePill,
                        {
                          borderColor:
                            selectedDurationSec === 30 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor:
                            selectedDurationSec === 30
                              ? '#1F1A2F'
                              : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        color={selectedDurationSec === 30 ? '#FFFFFF' : '#5F557F'}
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
                            selectedDurationSec === 60 ? '#1F1A2F' : '#D4CCE9',
                          backgroundColor:
                            selectedDurationSec === 60
                              ? '#1F1A2F'
                              : '#FFFFFF',
                        },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        color={selectedDurationSec === 60 ? '#FFFFFF' : '#5F557F'}
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
        </Animated.View>
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
  targetCue: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
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
  targetChip: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
  },
  arena: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(178,151,255,0.5)',
  },
  textureWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  textureDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  scanlineA: {
    position: 'absolute',
    left: -50,
    right: -50,
    top: '28%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-6deg' }],
  },
  scanlineB: {
    position: 'absolute',
    left: -50,
    right: -50,
    top: '64%',
    height: 1,
    backgroundColor: 'rgba(62,226,255,0.09)',
    transform: [{ rotate: '-6deg' }],
  },
  modalTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bubbleWrap: {
    position: 'absolute',
    zIndex: 10,
  },
  bubble: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.2,
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  bubblePressed: {
    transform: [{ scale: 0.96 }],
  },
  bubbleGlowOuter: {
    position: 'absolute',
    width: '132%',
    height: '132%',
    borderRadius: 999,
    opacity: 0.48,
  },
  bubbleGlowInner: {
    position: 'absolute',
    width: '114%',
    height: '114%',
    borderRadius: 999,
    opacity: 0.28,
  },
  bubbleDeepTone: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    opacity: 0.88,
  },
  bubbleGlossStrong: {
    position: 'absolute',
    width: '46%',
    height: '36%',
    borderRadius: 999,
    top: '12%',
    left: '14%',
    backgroundColor: 'rgba(255,255,255,0.76)',
    transform: [{ rotate: '-14deg' }],
  },
  bubbleGlossSoft: {
    position: 'absolute',
    width: '22%',
    height: '22%',
    borderRadius: 999,
    top: '44%',
    left: '61%',
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  bubbleSpec: {
    position: 'absolute',
    width: '26%',
    height: '26%',
    borderRadius: 999,
    top: '54%',
    left: '26%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  burstWrap: {
    position: 'absolute',
    width: 1,
    height: 1,
    zIndex: 15,
  },
  burstRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
    borderRadius: 999,
    borderWidth: 2.4,
  },
  burstRingSecondary: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -11,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.9,
  },
  burstDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    marginLeft: -4.5,
    marginTop: -4.5,
    borderRadius: 999,
  },
  burstCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  comboPopupWrap: {
    position: 'absolute',
    zIndex: 17,
  },
  comboPopup: {
    marginLeft: -18,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
  },
  comboPopupGood: {
    backgroundColor: 'rgba(255,245,183,0.9)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  comboPopupBad: {
    backgroundColor: 'rgba(255,49,139,0.86)',
    borderColor: 'rgba(255,200,226,0.92)',
  },
  hitFlash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    padding: spacing.md,
    backgroundColor: 'rgba(18,12,10,0.28)',
  },
  startCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DEFA',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
