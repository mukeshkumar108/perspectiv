import { ScrollView, StyleSheet } from 'react-native';

import { ScreenContainer, ScreenHeader, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { MomentCard } from '@/src/components/MomentCard';
import { useVoiceLibrary } from '@/src/hooks';

export default function LibraryScreen() {
  const theme = useTheme();
  const { data, isLoading, error } = useVoiceLibrary();
  const items = data?.items ?? [];

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader title="My moments" />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Text variant="small" color={theme.textTertiary}>
            Loading
          </Text>
        ) : error ? (
          <Text variant="small" color={theme.textTertiary}>
            Could not load your moments.
          </Text>
        ) : items.length === 0 ? (
          <Text variant="body" color={theme.textTertiary}>
            Nothing here yet. After your next spoken session, what you named will be kept here.
          </Text>
        ) : (
          items.map((item) => <MomentCard key={item.id} card={item.card} createdAt={item.createdAt} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
});
