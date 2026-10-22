import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { ScreenContainer, Text, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useVoiceLibrary } from '@/src/hooks';

function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error } = useVoiceLibrary();
  const items = data?.items ?? [];

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
        <Text variant="bodyMedium">What you were grateful for</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Text variant="small" color={theme.textSecondary}>
            Loading
          </Text>
        ) : error ? (
          <Text variant="small" color={theme.textSecondary}>
            Could not load your moments.
          </Text>
        ) : items.length === 0 ? (
          <Text variant="body" color={theme.textSecondary}>
            Nothing here yet. After your next spoken session, the moment you named will be kept here.
          </Text>
        ) : (
          items.map((item) => (
            <Card key={item.id} style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}>
              <Text variant="small" color={theme.textSecondary}>
                {formatDay(item.createdAt)}
              </Text>
              {item.card?.headline ? (
                <Text variant="bodyMedium" style={styles.headline}>
                  {item.card.headline}
                </Text>
              ) : null}
              <Text variant="body" style={styles.moment}>
                {item.card?.moment}
              </Text>
              {item.card?.tags?.length ? (
                <Text variant="small" color={theme.textSecondary} style={styles.tags}>
                  {item.card.tags.join('  ·  ')}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  spacer: { width: 22 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: {},
  headline: { marginTop: spacing.xs },
  moment: { marginTop: spacing.xs },
  tags: { marginTop: spacing.sm },
});
