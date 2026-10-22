import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, BrainCircuit, Gauge } from 'lucide-react-native';

import { AccentCard, Overline, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { getAssessmentTitle, scoreBand, type AssessmentType } from '@/src/assessments/model';
import { useAssessmentResults } from '@/src/assessments/storage';

const MAX: Record<AssessmentType, number> = { phq9: 27, gad7: 21, cantril: 10 };

export default function AssessmentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const results = useAssessmentResults(12);

  const latestLine = (type: AssessmentType, blurb: string) => {
    const latest = results.find((entry) => entry.type === type);
    return latest ? `${blurb}\nLatest ${latest.score}/${MAX[type]} · ${scoreBand(type, latest.score)}` : `${blurb}\nNo score yet`;
  };

  return (
    <ScreenContainer safeBottom={false} ambient={false}>
      <ScreenHeader title="Assessments" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.textTertiary}>
          Short measures you can repeat to see how things move over time.
        </Text>

        <View style={styles.group}>
          <AccentCard
            title="PHQ-9"
            subtitle={latestLine('phq9', 'Nine questions about low mood.')}
            accent={sessionAccents.evening}
            icon={<Activity size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/assessments/phq9' as any)}
          />
          <AccentCard
            title="GAD-7"
            subtitle={latestLine('gad7', 'Seven questions about worry and anxiety.')}
            accent={sessionAccents.daytime}
            icon={<BrainCircuit size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/assessments/gad7' as any)}
          />
          <AccentCard
            title="Cantril Ladder"
            subtitle={latestLine('cantril', 'One question about life overall, today.')}
            accent={sessionAccents.ten_things}
            icon={<Gauge size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/assessments/cantril' as any)}
          />
        </View>

        {results.length > 0 ? (
          <View style={styles.group}>
            <Overline>Recent</Overline>
            {results.slice(0, 8).map((entry) => (
              <View key={entry.id} style={[styles.row, { borderColor: theme.border }]}>
                <Text variant="small" medium>
                  {getAssessmentTitle(entry.type)}
                </Text>
                <Text variant="small" color={theme.textSecondary}>
                  {entry.score}/{entry.maxScore} · {scoreBand(entry.type, entry.score)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
