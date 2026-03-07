import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
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

export function GamePregame({
  title,
  subtitle,
  whyItHelps,
  whatItMeasures,
  howToPlay,
  playPath,
  recentLines,
}: GamePregameProps) {
  const router = useRouter();
  const theme = useTheme();
  const [durationSec, setDurationSec] = useState<30 | 60>(30);

  const openPlay = () => {
    router.push(`${playPath}?duration=${durationSec}&autostart=1` as any);
  };

  return (
    <ScreenContainer safeBottom={false}>
      <View style={styles.header}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text variant="title">{title}</Text>
          <Text variant="body" color={theme.textSecondary}>
            {subtitle}
          </Text>
        </View>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Session length</Text>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setDurationSec(30)}
              style={[
                styles.modePill,
                {
                  borderColor: durationSec === 30 ? theme.text : theme.border,
                  backgroundColor: durationSec === 30 ? theme.text : theme.backgroundSecondary,
                },
              ]}
            >
              <Text variant="bodyMedium" color={durationSec === 30 ? theme.surface : theme.text}>
                30s
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDurationSec(60)}
              style={[
                styles.modePill,
                {
                  borderColor: durationSec === 60 ? theme.text : theme.border,
                  backgroundColor: durationSec === 60 ? theme.text : theme.backgroundSecondary,
                },
              ]}
            >
              <Text variant="bodyMedium" color={durationSec === 60 ? theme.surface : theme.text}>
                60s
              </Text>
            </Pressable>
          </View>
          <Button title="Start Game" onPress={openPlay} />
        </Card>

        <View style={styles.copySection}>
          <Text variant="bodyMedium">Why this exists</Text>
          {whyItHelps.map((line, index) => (
            <Text key={`why-${index}`} variant="small" color={theme.textSecondary}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.copySection}>
          <Text variant="bodyMedium">What this measures</Text>
          {whatItMeasures.map((line, index) => (
            <Text key={`measure-${index}`} variant="small" color={theme.textSecondary}>
              • {line}
            </Text>
          ))}
        </View>

        <View style={styles.copySection}>
          <Text variant="bodyMedium">How to play</Text>
          {howToPlay.map((line, index) => (
            <Text key={`how-${index}`} variant="small" color={theme.textSecondary}>
              {index + 1}. {line}
            </Text>
          ))}
        </View>

        {recentLines && recentLines.length > 0 ? (
          <View style={styles.copySection}>
            <Text variant="bodyMedium">Recent scores</Text>
            {recentLines.map((line, index) => (
              <Text key={`recent-${index}`} variant="small" color={theme.textSecondary}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    gap: spacing.xs,
  },
  card: {
    gap: spacing.xs,
  },
  copySection: {
    gap: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  modePill: {
    minWidth: 66,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
