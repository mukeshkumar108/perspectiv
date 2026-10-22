import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Flame } from 'lucide-react-native';

import { Card, Overline, Pill, ScreenContainer, ScreenIntro, Text, brand, layout, sessionAccents } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { AppBar } from '@/src/components/AppBar';
import { MomentCard, formatDay } from '@/src/components/MomentCard';
import { MomentDeck, type DeckItem } from '@/src/components/MomentDeck';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useStreaks, useVoiceLibrary } from '@/src/hooks';

const KIND_ACCENT: Record<string, string> = {
  moment: sessionAccents.evening.base,
  intention: sessionAccents.morning.base,
  self: sessionAccents.ten_things.base,
};

function dayLabel(d: Date): string {
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function MomentsScreen() {
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { data: streaks } = useStreaks();
  const { data, isLoading, error, refetch } = useVoiceLibrary();
  const items = data?.items ?? [];
  const [mode, setMode] = useState<'stack' | 'days'>('stack');
  const [front, setFront] = useState<DeckItem | null>(null);
  const streak = streaks?.currentStreak ?? 0;

  const groups: { key: string; label: string; entries: typeof items }[] = [];
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(item);
    else groups.push({ key, label: dayLabel(d), entries: [item] });
  }

  return (
    <ScreenContainer ambient={false} safeBottom={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + layout.section }]} showsVerticalScrollIndicator={false}>
        <AppBar
          right={
            <View style={[styles.chip, { backgroundColor: theme.background }]}>
              <Flame size={15} color={streak > 0 ? brand.accent : theme.textTertiary} fill={streak > 0 ? brand.accent : 'transparent'} strokeWidth={2} />
              <Text variant="small" medium>
                {streak}
              </Text>
            </View>
          }
        />

        <ScreenIntro
          eyebrow={items.length ? `Your moments · ${items.length} kept` : 'Your moments'}
          title={mode === 'stack' && front ? formatDay(front.createdAt) : mode === 'days' ? 'Your days' : 'Nothing kept yet'}
          rule={false}
        />
        <View style={styles.modes}>
          <Pill label="Stack" active={mode === 'stack'} onPress={() => setMode('stack')} />
          <Pill label="Days" active={mode === 'days'} onPress={() => setMode('days')} />
        </View>

        {isLoading && items.length === 0 ? (
          <Text variant="small" color={theme.textTertiary}>
            Loading
          </Text>
        ) : error ? (
          <Text variant="small" color={theme.textTertiary} onPress={() => void refetch()}>
            Could not load. Tap to try again.
          </Text>
        ) : items.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="title">Nothing yet</Text>
            <Text variant="body" color={theme.textSecondary}>
              Have a spoken session and what you name will be kept here, one card at a time.
            </Text>
          </Card>
        ) : mode === 'stack' ? (
          <Animated.View entering={FadeInDown.delay(100).duration(340)}>
            <MomentDeck items={items} onFront={(item) => setFront(item)} />
          </Animated.View>
        ) : (
          <>
            <Card>
              <View style={styles.weekHead}>
                <Overline>This week</Overline>
                <Text variant="caption" color={theme.textTertiary}>{`Longest ${streaks?.longestStreak ?? 0} days`}</Text>
              </View>
              <View style={styles.week}>
                <WeekStrip dates={items.map((i) => new Date(i.createdAt))} />
              </View>
            </Card>
            {groups.map((group, gi) => (
              <Animated.View key={group.key} entering={FadeInDown.delay(Math.min(gi, 5) * 60 + 80).duration(320)} style={styles.group}>
                <Overline>{group.label}</Overline>
                <View style={styles.rail}>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                  <View style={styles.cards}>
                    {group.entries.map((entry) => (
                      <View key={entry.id}>
                        <View style={[styles.node, { backgroundColor: KIND_ACCENT[entry.card?.kind ?? 'moment'] ?? brand.accent, borderColor: theme.background }]} />
                        <MomentCard card={entry.card} createdAt={entry.createdAt} showDate={false} />
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: layout.gap, paddingTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 52 },
  modes: { flexDirection: 'row', gap: 8 },
  empty: { gap: 8 },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { marginTop: 14 },
  group: { gap: 8 },
  rail: { flexDirection: 'row', gap: 16 },
  line: { width: 2, borderRadius: 1, marginLeft: 6, opacity: 0.7 },
  cards: { flex: 1, gap: layout.gap },
  node: { position: 'absolute', left: -26, top: 20, width: 14, height: 14, borderRadius: 7, borderWidth: 3, zIndex: 2 },
});
