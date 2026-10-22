import { ScrollView, StyleSheet, View } from 'react-native';

import { LabeledValue, Overline, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { scoreBand } from '@/src/assessments/model';
import { useAssessmentResults } from '@/src/assessments/storage';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';
import { useStroopBloomHistory } from '@/src/games/stroopBloom/storage';

type Accent = { base: string; soft: string };

function Panel({ title, accent, children }: { title: string; accent: Accent; children: React.ReactNode }) {
  return (
    <View style={[styles.panel, { backgroundColor: accent.soft }]}>
      <View style={styles.panelHead}>
        <View style={[styles.dot, { backgroundColor: accent.base }]} />
        <Overline>{title}</Overline>
      </View>
      <View style={styles.values}>{children}</View>
    </View>
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const assessments = useAssessmentResults(20);
  const impulse = useImpulsePopHistory(20);
  const memory = useMemoryMatchHistory(20);
  const stroop = useStroopBloomHistory(20);

  const best = (items: { score: number }[]) => items.reduce((b, item) => Math.max(b, item.score), 0);
  const latest = assessments[0];

  return (
    <ScreenContainer safeBottom={false} ambient={false}>
      <ScreenHeader title="Progress" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.textTertiary}>
          Your highs and your latest scores. Saved on this device.
        </Text>

        <Panel title="Game highs" accent={sessionAccents.daytime}>
          <LabeledValue label="Impulse Pop" value={String(best(impulse))} />
          <LabeledValue label="Memory Match" value={String(best(memory))} />
          <LabeledValue label="Stroop Bloom" value={String(best(stroop))} />
        </Panel>

        <Panel title="Latest assessment" accent={sessionAccents.evening}>
          {latest ? (
            <LabeledValue label={latest.type.toUpperCase()} value={`${latest.score} of ${latest.maxScore}`} secondary={scoreBand(latest.type, latest.score)} />
          ) : (
            <Text variant="small" color={theme.textTertiary}>
              None yet.
            </Text>
          )}
        </Panel>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  panel: { borderRadius: 24, padding: spacing.lg, gap: spacing.md },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
});
