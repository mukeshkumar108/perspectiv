import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import Animated from 'react-native-reanimated';
import { Activity, Headphones, Timer, Wind, Zap } from 'lucide-react-native';

import { AccentCard, Overline, ScreenContainer, Text, sessionAccents, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';

const ICON = { size: 20, strokeWidth: 1.8 } as const;

function Section({ title, why, children }: { title: string; why: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Overline>{title}</Overline>
        <Text variant="small" color={theme.textSecondary}>
          {why}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Everything that is not the daily conversation, each with a line on what it is for. */
export default function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const go = (path: string) => () => router.push(path as any);

  return (
    <ScreenContainer ambient={false} safeBottom={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={motion.itemEnter(40, 'up')} style={styles.head}>
          <Text variant="hero">Explore</Text>
          <Text variant="body" color={theme.textTertiary}>
            Small things that sit alongside your daily conversation.
          </Text>
        </Animated.View>

        <Animated.View entering={motion.itemEnter(110, 'up')} style={styles.sections}>
          <Section title="Listen" why="A few minutes on how attention and mood actually work.">
            <AccentCard title="Lessons" subtitle="Short audio on the negativity bias, and what to do about it." accent={sessionAccents.evening} icon={<Headphones color={theme.text} {...ICON} />} onPress={go('/(main)/lessons')} />
            <AccentCard title="Guided breathing" subtitle="A calm voice and a slow rhythm, for when you need to settle." accent={sessionAccents.daytime} icon={<Wind color={theme.text} {...ICON} />} onPress={go('/(main)/guides')} />
          </Section>

          <Section title="Train your attention" why="Thirty seconds each. They measure how alert and controlled you are, so you can watch it change.">
            <AccentCard title="Flash" subtitle="Reaction time. Tap when it turns pink." accent={sessionAccents.morning} icon={<Timer color={theme.text} {...ICON} />} onPress={go('/(main)/games/flash')} />
            <AccentCard title="All games" subtitle="Impulse Pop, Memory Match, Stroop Bloom." accent={sessionAccents.ten_things} icon={<Zap color={theme.text} {...ICON} />} onPress={go('/(main)/(tabs)/games')} />
          </Section>

          <Section title="Check in with yourself" why="Well-known short questionnaires, so you can see your own pattern over weeks. Private to this phone.">
            <AccentCard title="Assessments" subtitle="Mood, worry, and how life feels overall." accent={sessionAccents.onboarding} icon={<Activity color={theme.text} {...ICON} />} onPress={go('/(main)/assessments')} />
          </Section>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.lg },
  head: { gap: spacing.sm },
  sections: { gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionHead: { gap: 4, marginBottom: spacing.xs },
});
