import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Pause,
  Play,
  Headphones,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { motion } from '@/src/ui/motion';
import { Character } from '@/src/components';
import { guidedSessions } from '@/src/content/guidedContent';

type PlaybackStatus = {
  isLoaded: boolean;
  positionMillis: number;
  durationMillis?: number;
  isPlaying: boolean;
};

function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function GuideDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = guidedSessions.find((item) => item.id === id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((session?.durationMin ?? 5) * 60 * 1000);
  const soundRef = useRef<any>(null);
  const progress = useSharedValue(0);
  const progressRatio = useMemo(() => {
    if (!durationMs || durationMs <= 0) return 0;
    return Math.max(0, Math.min(1, positionMs / durationMs));
  }, [durationMs, positionMs]);

  useEffect(() => {
    progress.value = withTiming(progressRatio, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, progressRatio]);

  useEffect(() => {
    let mounted = true;
    if (!session) return;

    const loadSound = async () => {
      let AudioModule: any;
      try {
        AudioModule = require('expo-av').Audio;
      } catch {
        return;
      }
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await AudioModule.Sound.createAsync(
          session.audioSource,
          { shouldPlay: false },
          (status: PlaybackStatus) => {
            if (!mounted || !status.isLoaded) return;
            setPositionMs(status.positionMillis);
            setDurationMs(status.durationMillis ?? (session.durationMin * 60 * 1000));
            setIsPlaying(status.isPlaying);
          }
        );
        soundRef.current = sound;
      } catch {
        // Placeholder flow, ignore load failures for now.
      }
    };

    loadSound();
    return () => {
      mounted = false;
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) sound.unloadAsync();
    };
  }, [session]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const togglePlayback = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      return;
    }
    await sound.playAsync();
  };

  const seekBy = async (deltaMs: number) => {
    const sound = soundRef.current;
    if (!sound) return;
    const next = Math.max(0, Math.min(durationMs, positionMs + deltaMs));
    await sound.setPositionAsync(next);
  };

  if (!session) {
    return (
      <ScreenContainer style={styles.container} ambient={false}>
        <Text variant="title">Session not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      style={[styles.container, { backgroundColor: '#F7F6EB' }]}
      ambient={false}
    >
      <View style={styles.characterDock} pointerEvents="none">
        <Character alignment="center" />
      </View>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
        <Pressable onPress={() => router.replace('/(main)/(tabs)' as any)} hitSlop={14}>
          <X size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
      </View>

      <Animated.View entering={motion.itemEnter(70, 'up')} style={styles.content}>
        <Text variant="title">{session.title}</Text>
        <Text variant="body" color={theme.textSecondary} style={styles.subtitle}>
          {session.subtitle}
        </Text>
      </Animated.View>

      <Animated.View entering={motion.itemEnter(140, 'up')} style={styles.meta}>
        <View style={styles.metaRow}>
          <Headphones size={18} color={theme.text} strokeWidth={1.8} />
          <Text variant="small" color={theme.textSecondary}>
            Audio-first guided experience
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Play size={18} color={theme.text} strokeWidth={1.8} />
          <Text variant="small" color={theme.textSecondary}>
            {session.durationMin} min session • audio guide
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={motion.itemEnter(220, 'up')} style={styles.playerShell}>
        <Text variant="small" color={theme.textSecondary}>
          Session progress
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: theme.text }, progressStyle]}
          />
        </View>
        <View style={styles.timeRow}>
          <Text variant="caption" color={theme.textTertiary}>
            {formatMs(positionMs)}
          </Text>
          <Text variant="caption" color={theme.textTertiary}>
            -{formatMs(Math.max(0, durationMs - positionMs))}
          </Text>
        </View>
        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={() => seekBy(-15000)}>
            <SkipBack size={18} color={theme.text} strokeWidth={2} />
          </Pressable>
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
          <Pressable style={styles.controlButton} onPress={() => seekBy(15000)}>
            <SkipForward size={18} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={motion.itemEnter(280, 'up')} style={styles.footer}>
        <Button title="End session" variant="secondary" onPress={() => router.back()} />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  characterDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    position: 'relative',
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  content: {
    zIndex: 20,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.xl,
    gap: spacing.md,
    zIndex: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerShell: {
    marginTop: spacing.xl,
    gap: spacing.md,
    zIndex: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transformOrigin: 'left',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
    zIndex: 20,
  },
});
