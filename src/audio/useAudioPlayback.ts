import { useCallback, useEffect, useRef, useState } from 'react';
import type { AVPlaybackStatus, Sound } from './sound';

type Source = { uri: string } | number;

/** Loads one audio source and exposes its playback state. Shared by lessons and guided sessions. */
export function useAudioPlayback(source: Source | null, fallbackDurationMs: number) {
  const soundRef = useRef<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(fallbackDurationMs);
  const [failed, setFailed] = useState(false);
  const key = typeof source === 'number' ? String(source) : (source?.uri ?? '');

  useEffect(() => {
    if (!source) return;
    let mounted = true;
    setFailed(false);
    (async () => {
      try {
        const { Audio } = await import('./sound');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false }, (status: AVPlaybackStatus) => {
          if (!mounted || !status.isLoaded) return;
          setPositionMs(status.positionMillis);
          setDurationMs(status.durationMillis ?? fallbackDurationMs);
          setIsPlaying(status.isPlaying);
        });
        if (!mounted) {
          void sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) void sound.unloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    if (isPlaying) await sound.pauseAsync();
    else await sound.playAsync();
  }, [isPlaying]);

  const seekBy = useCallback(
    async (deltaMs: number) => {
      const sound = soundRef.current;
      if (!sound) return;
      await sound.setPositionAsync(Math.max(0, Math.min(durationMs, positionMs + deltaMs)));
    },
    [durationMs, positionMs],
  );

  return { isPlaying, positionMs, durationMs, failed, toggle, seekBy };
}

export function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
