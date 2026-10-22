import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Headphones } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentCard, Overline, PressScale, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
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
              const minutes = typeof item.durationSec === 'number' ? `${Math.max(1, Math.round(item.durationSec / 60))} min` : null;
              return (
                <AccentCard
                  key={`${routeId}-${index}`}
                  title={item.title}
                  subtitle={[item.description, minutes].filter(Boolean).join('\n')}
                  accent={ACCENTS[index % ACCENTS.length]}
                  icon={<Headphones size={20} color={theme.text} strokeWidth={1.8} />}
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
