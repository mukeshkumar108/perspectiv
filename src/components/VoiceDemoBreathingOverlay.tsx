import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { AVPlaybackStatus, Sound } from '@/src/audio/sound';
import { Pause, Play, X } from 'lucide-react-native';

import { Button, Card, ScreenContainer, Text, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { guidedSessions } from '@/src/content/guidedContent';

type Props = {
  visible: boolean;
  slug: string;
  onComplete: (result: {
    outcome: 'COMPLETED' | 'EXITED';
    durationSec: number;
    completedPct: number;
  }) => void;
  onDismiss: () => void;
};

function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function VoiceDemoBreathingOverlay({
  visible,
  slug,
  onComplete,
  onDismiss,
}: Props) {
  const theme = useTheme();
  const session = useMemo(
    () => guidedSessions.find((item) => item.id === slug) ?? null,
    [slug],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((session?.durationMin ?? 2) * 60 * 1000);
  const soundRef = useRef<Sound | null>(null);
  const playbackStartedAtRef = useRef(false);

  useEffect(() => {
    if (!visible || !session) return;
    let mounted = true;

    const loadSound = async () => {
      const { Audio: AudioModule } = await import('@/src/audio/sound');
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await AudioModule.Sound.createAsync(
          session.audioSource,
          { shouldPlay: false },
          (status: AVPlaybackStatus) => {
            if (!mounted || !status.isLoaded) return;
            setPositionMs(status.positionMillis);
            setDurationMs(status.durationMillis ?? (session.durationMin * 60 * 1000));
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              playbackStartedAtRef.current = false;
              onComplete({
                outcome: 'COMPLETED',
                durationSec: Math.round((status.durationMillis ?? 0) / 1000),
                completedPct: 1,
              });
            }
          },
        );
        soundRef.current = sound;
      } catch {
        onDismiss();
      }
    };

    void loadSound();

    return () => {
      mounted = false;
      const sound = soundRef.current;
      soundRef.current = null;
      setIsPlaying(false);
      setHasStarted(false);
      setPositionMs(0);
      playbackStartedAtRef.current = false;
      if (sound) {
        void sound.unloadAsync();
      }
    };
  }, [visible, session, onComplete, onDismiss]);

  const togglePlayback = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      return;
    }
    playbackStartedAtRef.current = true;
    setHasStarted(true);
    await sound.playAsync();
  };

  const handleClose = () => {
    const completedPct =
      durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
    if (playbackStartedAtRef.current || positionMs > 0) {
      onComplete({
        outcome: 'EXITED',
        durationSec: Math.round(positionMs / 1000),
        completedPct,
      });
      return;
    }
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <ScreenContainer style={[styles.container, { backgroundColor: theme.background }]} ambient={false}>
        <View style={styles.header}>
          <Text variant="bodyMedium">Guided Reset</Text>
          <Pressable onPress={handleClose} hitSlop={16}>
            <X size={22} color={theme.text} strokeWidth={1.8} />
          </Pressable>
        </View>

        <Card style={styles.card}>
          <Text variant="title">{session?.title ?? 'Breathing'}</Text>
          <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
            {session?.subtitle ?? 'Take one guided breath at a time.'}
          </Text>
          {!hasStarted ? (
            <View style={styles.preStartActions}>
              <Button title="Start" onPress={togglePlayback} />
              <Button title="Dismiss" variant="ghost" onPress={handleClose} />
            </View>
          ) : null}
          {hasStarted ? (
            <>
              <View style={styles.progressRow}>
                <Text variant="small" color={theme.textSecondary}>
                  {formatMs(positionMs)}
                </Text>
                <Text variant="small" color={theme.textSecondary}>
                  -{formatMs(Math.max(0, durationMs - positionMs))}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.text,
                      width: `${durationMs > 0 ? Math.max(0, Math.min(100, (positionMs / durationMs) * 100)) : 0}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.controls}>
                <Pressable
                  style={[styles.playButton, { backgroundColor: '#FF7DAF' }]}
                  onPress={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause size={20} color="#231E15" strokeWidth={2.2} />
                  ) : (
                    <Play size={20} color="#231E15" strokeWidth={2.2} />
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
          <Button title="Close" variant="secondary" onPress={handleClose} />
        </Card>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  preStartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  controls: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  playButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
