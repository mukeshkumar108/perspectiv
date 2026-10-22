import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Wind } from 'lucide-react-native';

import { AccentCard, Overline, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { guidedSessions } from '@/src/content/guidedContent';

export default function GuidesScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer ambient={false}>
      <ScreenHeader title="Guided sessions" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.textTertiary}>
          A calm voice and a slow rhythm, for when you need to settle.
        </Text>
        <View style={styles.group}>
          <Overline>Breathing</Overline>
          {guidedSessions.map((session) => (
            <AccentCard
              key={session.id}
              title={session.title}
              subtitle={`${session.subtitle}\n${session.durationMin} min`}
              accent={sessionAccents.daytime}
              icon={<Wind size={20} color={theme.text} strokeWidth={1.8} />}
              onPress={() => router.push({ pathname: '/(main)/guide/[id]' as any, params: { id: session.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
});
