import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrimaryButton, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { AudioPlayerScreen } from '@/src/components/AudioPlayerScreen';
import { guidedSessions } from '@/src/content/guidedContent';

export default function GuideDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = guidedSessions.find((item) => item.id === id);

  if (!session) {
    return (
      <ScreenContainer ambient={false} style={{ flex: 1 }}>
        <ScreenHeader />
        <Text variant="title">Session not found</Text>
        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton title="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <AudioPlayerScreen
      overline={`Guided · ${session.durationMin} min`}
      title={session.title}
      description={session.subtitle}
      source={session.audioSource}
      fallbackDurationMs={session.durationMin * 60 * 1000}
      accent={sessionAccents.daytime}
    />
  );
}
