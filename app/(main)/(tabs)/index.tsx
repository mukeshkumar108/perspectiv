import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';

import { Overline, PressScale, PrimaryButton, ScreenContainer, Text, brand, daypartTint, sessionAccents, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';
import { BluumMark } from '@/src/components/BluumMark';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useDayPlan, useNeedsOnboarding, useNudge, useVoiceLibrary } from '@/src/hooks';
import type { SessionKind } from '@/src/ui/tokens';

const FLOW_ACCENT: Record<string, SessionKind> = { onboarding: 'onboarding', morning: 'morning', daytime: 'daytime', evening: 'evening' };

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { plan, greeting, streak } = useDayPlan();
  const { data: library } = useVoiceLibrary();
  const accent = sessionAccents[FLOW_ACCENT[plan.flow] ?? 'daytime'];
  const keptDates = (library?.items ?? []).map((i) => new Date(i.createdAt));

  const { nudge, dismiss } = useNudge(library?.items.length ?? 0);
  const needsOnboarding = useNeedsOnboarding();
  useEffect(() => {
    if (needsOnboarding) router.replace('/(main)/onboarding' as any);
  }, [needsOnboarding, router]);

  const talk = () => router.push('/(main)/talk' as any);

  return (
    <ScreenContainer ambient={false} safeBottom={false} tint={daypartTint[plan.daypart]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={motion.itemEnter(40, 'up')} style={styles.top}>
          <BluumMark size={38} />
          <PressScale onPress={() => router.push('/(main)/(tabs)/moments' as any)} accessibilityLabel={`${streak} day streak`} style={[styles.streak, { backgroundColor: theme.surface }]}>
            <Flame size={16} color={streak > 0 ? brand.pink : theme.textTertiary} fill={streak > 0 ? brand.pink : 'transparent'} strokeWidth={2} />
            <Text variant="small" medium>
              {streak}
            </Text>
          </PressScale>
        </Animated.View>

        <Animated.View entering={motion.itemEnter(120, 'up')} style={styles.greeting}>
          <Text variant="hero">{greeting.headline}</Text>
          <Text variant="body" color={theme.textSecondary}>
            {greeting.sub}
          </Text>
        </Animated.View>

        <PressScale onPress={talk} accessibilityRole="button" accessibilityLabel="Talk to Bluum" scaleTo={0.99} style={styles.orbStage}>
          <VoiceOrb state="idle" />
        </PressScale>

        <Animated.View entering={FadeInDown.delay(260).duration(380)} style={[styles.next, { backgroundColor: accent.soft }]}>
          <View style={[styles.glow, { backgroundColor: accent.base }]} />
          <Overline color={theme.textSecondary}>Next up</Overline>
          <Text variant="title">{plan.title}</Text>
          <Text variant="small" color={theme.textSecondary}>
            {plan.subtitle}
          </Text>
          <View style={styles.cta}>
            <PrimaryButton title="Talk to Bluum" arrow onPress={talk} />
          </View>
          {plan.eveningOpensAtHour ? (
            <Text variant="caption" color={theme.textSecondary}>
              {`Your evening reflection opens at ${plan.eveningOpensAtHour > 12 ? plan.eveningOpensAtHour - 12 : plan.eveningOpensAtHour} pm.`}
            </Text>
          ) : null}
        </Animated.View>

        {nudge ? (
          <Animated.View entering={FadeInDown.delay(320).duration(380)} style={[styles.nudge, { backgroundColor: theme.surface }]}>
            <Overline>A small suggestion</Overline>
            <Text variant="bodyMedium" medium>
              {nudge.title}
            </Text>
            <Text variant="small" color={theme.textSecondary}>
              {nudge.why}
            </Text>
            <View style={styles.nudgeRow}>
              <View style={styles.nudgeMain}>
                <PrimaryButton title={nudge.cta} variant="outline" onPress={() => router.push(nudge.route as any)} />
              </View>
              <PressScale onPress={() => dismiss(nudge.id)} style={styles.notNow}>
                <Text variant="small" color={theme.textTertiary}>
                  Not now
                </Text>
              </PressScale>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(380).duration(380)} style={[styles.week, { backgroundColor: theme.surface }]}>
          <View style={styles.weekHead}>
            <Overline>This week</Overline>
            <Text variant="caption" color={theme.textTertiary}>
              {streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} in a row` : 'A fresh start'}
            </Text>
          </View>
          <WeekStrip dates={keptDates} />
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 56 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 8 },
  greeting: { gap: spacing.sm },
  orbStage: { alignItems: 'center', justifyContent: 'center', marginVertical: -spacing.md },
  next: { borderRadius: 32, padding: spacing.lg, gap: spacing.sm, overflow: 'hidden' },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, top: -90, opacity: 0.4 },
  cta: { marginTop: spacing.md },
  nudge: { borderRadius: 28, padding: spacing.lg, gap: spacing.sm },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  nudgeMain: { flex: 1 },
  notNow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  week: { borderRadius: 28, padding: spacing.lg, gap: spacing.md },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
