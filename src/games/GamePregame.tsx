import { ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button, Overline, Pill, ScreenContainer, ScreenHeader, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

type GamePregameProps = {
  title: string;
  subtitle: string;
  whyItHelps: string[];
  whatItMeasures: string[];
  howToPlay: string[];
  playPath: string;
  recentLines?: string[];
};

function Block({ title, lines, numbered }: { title: string; lines: string[]; numbered?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.block}>
      <Overline>{title}</Overline>
      {lines.map((line, index) => (
        <Text key={`${title}-${index}`} variant="small" color={theme.textSecondary}>
          {numbered ? `${index + 1}.  ` : ''}
          {line}
        </Text>
      ))}
    </View>
  );
}

export function GamePregame({ title, subtitle, whyItHelps, whatItMeasures, howToPlay, playPath, recentLines }: GamePregameProps) {
  const router = useRouter();
  const theme = useTheme();
  const [durationSec, setDurationSec] = useState<30 | 60>(30);

  const openPlay = () => {
    router.push(`${playPath}?duration=${durationSec}&autostart=1` as any);
  };

  return (
    <ScreenContainer safeBottom={false} ambient={false}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text variant="hero">{title}</Text>
          <Text variant="body" color={theme.textTertiary}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.block}>
          <Overline>Length</Overline>
          <View style={styles.row}>
            <Pill label="30 seconds" active={durationSec === 30} onPress={() => setDurationSec(30)} />
            <Pill label="60 seconds" active={durationSec === 60} onPress={() => setDurationSec(60)} />
          </View>
        </View>

        <Button title="Start" onPress={openPlay} />

        <Block title="Why this exists" lines={whyItHelps} />
        <Block title="What it measures" lines={whatItMeasures} />
        <Block title="How to play" lines={howToPlay} numbered />
        {recentLines && recentLines.length > 0 ? <Block title="Recent scores" lines={recentLines} /> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.xs },
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
