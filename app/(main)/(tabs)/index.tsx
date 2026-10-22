import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Flame, Mic } from 'lucide-react-native';

import { Card, Overline, PressScale, PrimaryButton, ScreenContainer, ScreenIntro, Text, brand, layout } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { AppBar } from '@/src/components/AppBar';
import { VoiceOrb } from '@/src/components/VoiceOrb';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useDayPlan, useNeedsOnboarding, useNudge, useVoiceLibrary } from '@/src/hooks';

const EYEBROW = { morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening' } as const;

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { plan, greeting, streak } = useDayPlan();
  const { data: library } = useVoiceLibrary();
  const { nudge, dismiss } = useNudge(library?.items.length ?? 0);
  const keptDates = (library?.items ?? []).map((i) => new Date(i.createdAt));

  const needsOnboarding = useNeedsOnboarding();
  useEffect(() => {
    if (needsOnboarding) router.replace('/(main)/onboarding' as any);
  }, [needsOnboarding, router]);

  const talk = () => router.push('/(main)/talk' as any);

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

        <ScreenIntro eyebrow={EYEBROW[plan.daypart]} title={greeting.headline} sub={greeting.sub} />

        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <PressScale onPress={talk} accessibilityRole="button" accessibilityLabel="Talk to Bluum" scaleTo={0.99}>
            <Card style={styles.next}>
              <View style={styles.orb} pointerEvents="none">
                <VoiceOrb state="idle" size={150} />
              </View>
              <Overline>Next up</Overline>
              <Text variant="title" style={styles.nextTitle}>
                {plan.title}
              </Text>
              <Text variant="small" color={theme.textSecondary} style={styles.nextSub}>
                {plan.subtitle}
              </Text>
              <View style={styles.talkRow}>
                <View style={[styles.mic, { backgroundColor: brand.accent }]}>
                  <Mic size={22} color={theme.text} strokeWidth={2} />
                </View>
                <View>
                  <Text variant="bodyMedium">Talk to Bluum</Text>
                  <Text variant="caption" color={theme.textTertiary}>
                    {plan.eveningOpensAtHour ? `Evening reflection opens at ${plan.eveningOpensAtHour > 12 ? plan.eveningOpensAtHour - 12 : plan.eveningOpensAtHour} pm` : 'Ringer on and volume up'}
                  </Text>
                </View>
              </View>
            </Card>
          </PressScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <Card>
            <View style={styles.weekHead}>
              <Overline>This week</Overline>
              <Text variant="caption" color={theme.textTertiary}>
                {streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} in a row` : 'A fresh start'}
              </Text>
            </View>
            <View style={styles.week}>
              <WeekStrip dates={keptDates} />
            </View>
          </Card>
        </Animated.View>

        {nudge ? (
          <Animated.View entering={FadeInDown.delay(280).duration(360)}>
            <Card>
              <Overline>A small suggestion</Overline>
              <Text variant="bodyMedium" style={styles.nudgeTitle}>
                {nudge.title}
              </Text>
              <Text variant="small" color={theme.textSecondary} style={styles.nudgeWhy}>
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
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: layout.gap, paddingTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 52 },
  next: { overflow: 'hidden', minHeight: 196 },
  orb: { position: 'absolute', right: -18, top: -18 },
  nextTitle: { marginTop: 6 },
  nextSub: { marginTop: 4, maxWidth: 190 },
  talkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 20 },
  mic: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { marginTop: 14 },
  nudgeTitle: { marginTop: 6 },
  nudgeWhy: { marginTop: 4 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  nudgeMain: { flex: 1 },
  notNow: { paddingVertical: 8, paddingHorizontal: 12 },
});
