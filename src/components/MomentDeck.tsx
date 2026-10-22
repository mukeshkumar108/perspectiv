import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Shuffle } from 'lucide-react-native';

import { Overline, PressScale, Text, brand, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import type { VoiceCard } from '@/src/api/schemas';
import { advance, initialOrder, shuffle, type DeckOrder } from './deckOrder';
import { formatDay } from './MomentCard';

export type DeckItem = { id: string; createdAt: string; card: VoiceCard | null };

const KIND: Record<string, { label: string; accent: { base: string; soft: string } }> = {
  moment: { label: 'A good moment', accent: sessionAccents.evening },
  intention: { label: 'Looking forward to', accent: sessionAccents.morning },
  self: { label: 'About me', accent: sessionAccents.ten_things },
};

const CARD_HEIGHT = 380;
const THROW_DISTANCE = 110;

function DeckCard({ item, depth, wiggle, onThrown }: { item: DeckItem; depth: number; wiggle: number; onThrown: () => void }) {
  const theme = useTheme();
  const kind = KIND[item.card?.kind ?? 'moment'] ?? KIND.moment;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const d = useSharedValue(depth);
  const fade = useSharedValue(1);
  const kick = useSharedValue(0);

  useEffect(() => {
    d.value = withSpring(depth, { damping: 16, stiffness: 180 });
  }, [depth, d]);
  useEffect(() => {
    if (wiggle === 0) return;
    kick.value = withSequence(withTiming(1, { duration: 120 }), withTiming(-1, { duration: 160 }), withSpring(0));
  }, [wiggle, kick]);

  const land = () => {
    onThrown();
    tx.value = 0;
    ty.value = 0;
    fade.value = 0;
    fade.value = withTiming(1, { duration: 260 });
  };

  const pan = Gesture.Pan()
    .enabled(depth === 0)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.4;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > THROW_DISTANCE || Math.abs(e.velocityX) > 900) {
        const dir = e.translationX >= 0 ? 1 : -1;
        tx.value = withTiming(dir * 520, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(land)();
        });
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => {
    const rot = depth === 0 ? tx.value / 22 + kick.value * 5 : interpolate(d.value, [0, 1, 2], [0, -3.2, 2.6]) + kick.value * 2;
    return {
      opacity: fade.value,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value + interpolate(d.value, [0, 1, 2], [0, 16, 30], 'clamp') },
        { rotate: `${rot}deg` },
        { scale: interpolate(d.value, [0, 1, 2], [1, 0.955, 0.91], 'clamp') },
      ],
    };
  });

  const words = (item.card?.moment ?? '').length;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { backgroundColor: kind.accent.soft, zIndex: 10 - depth, shadowColor: theme.text }, style]}>
        <View style={styles.cardTop}>
          <View style={[styles.dot, { backgroundColor: kind.accent.base }]} />
          <Overline color={theme.textSecondary}>{kind.label}</Overline>
        </View>
        <Text variant="hero" style={[styles.quoteMark, { color: brand.accent }]}>
          “
        </Text>
        <Text variant="quote" style={words > 170 ? styles.quoteSmall : undefined} numberOfLines={9}>
          {item.card?.moment}
        </Text>
        <View style={styles.cardBottom}>
          {item.card?.headline ? (
            <Text variant="small" medium color={theme.textSecondary} numberOfLines={1}>
              {item.card.headline}
            </Text>
          ) : null}
          {item.card?.tags?.length ? (
            <Text variant="caption" color={theme.textTertiary} numberOfLines={1}>
              {item.card.tags.join('  ·  ')}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Moments as a stack of cards. Swipe the top one away to see the next; Shuffle (or shake the phone) deals a random one.
 * `onFront` reports whichever card is on top, so the screen can show its date as the heading.
 */
export function MomentDeck({ items, onFront }: { items: DeckItem[]; onFront: (item: DeckItem, position: number) => void }) {
  const theme = useTheme();
  const [order, setOrder] = useState<DeckOrder>(() => initialOrder(items.length));
  const [wiggle, setWiggle] = useState(0);
  const lastShake = useRef(0);

  // New cards arriving (or leaving) reset the deck to the newest first.
  const signature = items.map((i) => i.id).join('|');
  useEffect(() => {
    setOrder(initialOrder(items.length));
  }, [signature, items.length]);

  const frontIndex = order[0];
  useEffect(() => {
    if (frontIndex !== undefined && items[frontIndex]) onFront(items[frontIndex], order.length ? order.indexOf(frontIndex) : 0);
  }, [frontIndex, items, onFront, order]);

  const deal = useCallback(() => {
    setOrder((o) => shuffle(o));
    setWiggle((n) => n + 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Shaking the phone deals a random card.
  useEffect(() => {
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const force = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (force > 2.1 && now - lastShake.current > 1200) {
        lastShake.current = now;
        deal();
      }
    });
    return () => sub.remove();
  }, [deal]);

  const visible = order.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.stack}>
        {[...visible].reverse().map((index, i) => {
          const depth = visible.length - 1 - i;
          const item = items[index];
          return item ? <DeckCard key={item.id} item={item} depth={depth} wiggle={wiggle} onThrown={() => setOrder((o) => advance(o))} /> : null;
        })}
      </View>
      <View style={styles.controls}>
        <Text variant="caption" color={theme.textTertiary}>
          Swipe through, or shake for a random one
        </Text>
        <PressScale onPress={deal} accessibilityRole="button" accessibilityLabel="Shuffle moments" style={[styles.shuffle, { borderColor: theme.text }]}>
          <Shuffle size={16} color={theme.text} strokeWidth={1.9} />
          <Text variant="small" medium>
            Shuffle
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  stack: { height: CARD_HEIGHT + 40, justifyContent: 'flex-start' },
  card: { position: 'absolute', left: 0, right: 0, top: 0, height: CARD_HEIGHT, borderRadius: 32, padding: spacing.lg, gap: spacing.sm, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  quoteMark: { fontSize: 56, lineHeight: 56, marginTop: spacing.xs, marginBottom: -spacing.md },
  quoteSmall: { fontSize: 17, lineHeight: 25 },
  cardBottom: { marginTop: 'auto', gap: 3 },
  controls: { alignItems: 'center', gap: spacing.md },
  shuffle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md - 2 },
});
