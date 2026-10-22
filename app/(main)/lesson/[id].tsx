import { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrimaryButton, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { AudioPlayerScreen } from '@/src/components/AudioPlayerScreen';
import { useLessons } from '@/src/hooks';
import { findLessonByRouteId, sortLessons } from '@/src/lessons/model';

const ACCENTS = [sessionAccents.evening, sessionAccents.daytime, sessionAccents.ten_things, sessionAccents.morning];

export default function LessonDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const lessonsQuery = useLessons();
  const sorted = useMemo(() => sortLessons(lessonsQuery.data?.items ?? []), [lessonsQuery.data?.items]);
  const lesson = useMemo(() => findLessonByRouteId(sorted, routeId), [routeId, sorted]);
  const index = Number.parseInt(routeId ?? '0', 10) || 0;

  if (lessonsQuery.isLoading || !lesson) {
    return (
      <ScreenContainer ambient={false} style={{ flex: 1 }}>
        <ScreenHeader />
        <Text variant={lessonsQuery.isLoading ? 'body' : 'title'} color={lessonsQuery.isLoading ? theme.textTertiary : theme.text}>
          {lessonsQuery.isLoading ? 'Loading' : 'Lesson not found'}
        </Text>
        {!lessonsQuery.isLoading ? (
          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton title="Back to lessons" variant="outline" onPress={() => router.replace('/(main)/lessons' as any)} />
          </View>
        ) : null}
      </ScreenContainer>
    );
  }

  return (
    <AudioPlayerScreen
      overline={`Lesson ${String(index + 1).padStart(2, '0')}`}
      title={lesson.title}
      description={lesson.description}
      source={lesson.audioUrl ? { uri: lesson.audioUrl } : null}
      fallbackDurationMs={(lesson.durationSec ?? 90) * 1000}
      accent={ACCENTS[index % ACCENTS.length]}
    />
  );
}
