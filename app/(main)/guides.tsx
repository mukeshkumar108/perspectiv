import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, PlayCircle } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { ScreenContainer, Text, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { motion } from '@/src/ui/motion';
import { guidedSessions } from '@/src/content/guidedContent';

export default function GuidesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = guidedSessions[0];

  const openSession = (id: string) => {
    router.push({ pathname: '/(main)/guide/[id]' as any, params: { id } });
  };


  return (
    <ScreenContainer style={[styles.container, { backgroundColor: theme.background }]} ambient={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <Animated.View entering={motion.itemEnter(60, 'up')}>
        <Text variant="title">Guided Sessions</Text>
        <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
          Start with a single guided breathing track.
        </Text>
      </Animated.View>

      <Animated.View entering={motion.itemEnter(120, 'up')} style={styles.section}>
        <Text variant="caption" color={theme.textTertiary} style={styles.sectionTitle}>
          Breathing
        </Text>
        {session ? (
          <Pressable onPress={() => openSession(session.id)}>
            <Card style={[styles.card, styles.sessionCard]}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text variant="bodyMedium">{session.title}</Text>
                  <Text variant="small" color={theme.textSecondary}>
                    {session.subtitle}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="caption" color={theme.textTertiary}>
                    {session.durationMin} min
                  </Text>
                  <PlayCircle size={20} color={theme.text} strokeWidth={1.8} />
                </View>
              </View>
            </Card>
          </Pressable>
        ) : null}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  card: {
    paddingVertical: spacing.md,
  },
  sessionCard: {
    backgroundColor: '#FF7DAF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
