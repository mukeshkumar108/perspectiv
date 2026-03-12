import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, PlayCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer, Card, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useLessons } from '@/src/hooks';
import { getLessonRouteId, sortLessons } from '@/src/lessons/model';

export default function LessonsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lessonsQuery = useLessons();

  const lessons = sortLessons(lessonsQuery.data?.items ?? []);

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">Lessons</Text>
        <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
          Short audio snacks from your library.
        </Text>

        {lessonsQuery.isLoading ? (
          <View style={styles.stateBlock}>
            <Text variant="small" color={theme.textSecondary}>Loading lessons...</Text>
          </View>
        ) : null}

        {lessonsQuery.isError ? (
          <View style={styles.stateBlock}>
            <Text variant="small" color={theme.error}>Could not load lessons.</Text>
            <Pressable onPress={() => lessonsQuery.refetch()}>
              <Text variant="small" color={theme.text}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!lessonsQuery.isLoading && !lessonsQuery.isError && lessons.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text variant="small" color={theme.textSecondary}>No lessons available yet.</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {lessons.map((item, index) => {
            const routeId = getLessonRouteId(item, index);
            return (
              <Pressable
                key={`${routeId}-${index}`}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/lesson/[id]' as any,
                    params: { id: routeId },
                  })
                }
              >
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.grow}>
                      <Text variant="bodyMedium">{item.title}</Text>
                      {item.description ? (
                        <Text variant="small" color={theme.textSecondary}>
                          {item.description}
                        </Text>
                      ) : null}
                      {typeof item.durationSec === 'number' ? (
                        <Text variant="caption" color={theme.textTertiary}>
                          {Math.max(1, Math.round(item.durationSec / 60))} min
                        </Text>
                      ) : null}
                    </View>
                    <PlayCircle size={20} color={theme.text} strokeWidth={1.8} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  stateBlock: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
});
