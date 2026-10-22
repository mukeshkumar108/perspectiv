import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, Palette, Zap } from 'lucide-react-native';

import { AccentCard, Overline, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useImpulsePopHistory } from '@/src/games/impulsePop/storage';
import { useMemoryMatchHistory } from '@/src/games/memoryMatch/storage';
import { useStroopBloomHistory } from '@/src/games/stroopBloom/storage';

export default function GamesHubScreen() {
  const router = useRouter();
  const theme = useTheme();

  const impulse = useImpulsePopHistory(20);
  const memory = useMemoryMatchHistory(20);
  const stroop = useStroopBloomHistory(20);
  const best = (items: { score: number }[]) => items.reduce((b, item) => Math.max(b, item.score), 0);

  return (
    <ScreenContainer safeBottom={false} ambient={false}>
      <ScreenHeader title="Games" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={theme.textTertiary}>
          Thirty seconds each. They measure attention and memory, so you can watch them change.
        </Text>
        <View style={styles.group}>
          <Overline>Pick one</Overline>
          <AccentCard
            title="Impulse Pop"
            subtitle={`Attention and impulse control.\nBest ${best(impulse)}`}
            accent={sessionAccents.evening}
            icon={<Zap size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/games/impulse-pop' as any)}
          />
          <AccentCard
            title="Memory Match"
            subtitle={`Working memory and focus.\nBest ${best(memory)}`}
            accent={sessionAccents.daytime}
            icon={<Brain size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/games/memory-match' as any)}
          />
          <AccentCard
            title="Stroop Bloom"
            subtitle={`Inhibition under visual conflict.\nBest ${best(stroop)}`}
            accent={sessionAccents.ten_things}
            icon={<Palette size={20} color={theme.text} strokeWidth={1.8} />}
            onPress={() => router.push('/(main)/games/stroop-bloom' as any)}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
});
