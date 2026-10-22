import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Overline, PressScale, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { LessonCard } from '@/src/components/LessonCard';
import { useTheme } from '@/src/ui/useTheme';
import { useLessons } from '@/src/hooks';
import { getLessonRouteId, sortLessons } from '@/src/lessons/model';

const ACCENTS = [sessionAccents.evening, sessionAccents.daytime, sessionAccents.ten_things, sessionAccents.morning];

export default function LessonsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lessonsQuery = useLessons();
  const lessons = sortLessons(lessonsQuery.data?.items ?? []);

  return (
    <ScreenContainer safeBottom={false} ambient={false}>
      <ScreenHeader title="Lessons" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.textTertiary}>
          Short audio on how your attention and mood work.
        </Text>

        {lessonsQuery.isLoading ? (
          <Text variant="small" color={theme.textTertiary}>
            Loading
          </Text>
        ) : null}

        {lessonsQuery.isError ? (
          <View style={styles.state}>
            <Text variant="small" color={theme.error}>
              Could not load lessons.
            </Text>
            <PressScale onPress={() => lessonsQuery.refetch()}>
              <Text variant="small" medium>
                Try again
              </Text>
            </PressScale>
          </View>
        ) : null}

        {!lessonsQuery.isLoading && !lessonsQuery.isError && lessons.length === 0 ? (
          <Text variant="small" color={theme.textTertiary}>
            No lessons yet.
          </Text>
        ) : null}

        {lessons.length > 0 ? (
          <View style={styles.group}>
            <Overline>{`${lessons.length} lessons`}</Overline>
            {lessons.map((item, index) => {
              const routeId = getLessonRouteId(item, index);
              return (
                <LessonCard
                  key={`${routeId}-${index}`}
                  index={index}
                  title={item.title}
                  description={item.description}
                  minutes={typeof item.durationSec === 'number' ? Math.max(1, Math.round(item.durationSec / 60)) : null}
                  accent={ACCENTS[index % ACCENTS.length]}
                  onPress={() => router.push({ pathname: '/(main)/lesson/[id]' as any, params: { id: routeId } })}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  group: { gap: spacing.sm },
  state: { gap: spacing.sm },
});
