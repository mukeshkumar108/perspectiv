import { createAudioPlayer, setAudioModeAsync, type AudioSource } from 'expo-audio';

// Thin stand-in for the expo-av Sound API, backed by expo-audio (expo-av is dropped in the SDK 57 migration).
// Keeps call sites small: createAsync -> { sound }, status callback, play/pause/seek/unload.

export type AVPlaybackStatus =
  | { isLoaded: false }
  | {
      isLoaded: true;
      isPlaying: boolean;
      positionMillis: number;
      durationMillis: number | undefined;
      didJustFinish: boolean;
    };

export type Sound = {
  playAsync: () => Promise<void>;
  pauseAsync: () => Promise<void>;
  setPositionAsync: (millis: number) => Promise<void>;
  unloadAsync: () => Promise<void>;
};

type CreateOptions = { shouldPlay?: boolean };

const Audio = {
  setAudioModeAsync: (_options?: { playsInSilentModeIOS?: boolean; staysActiveInBackground?: boolean }) =>
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false }),
  Sound: {
    createAsync: async (
      source: AudioSource,
      options: CreateOptions = {},
      onStatus?: (status: AVPlaybackStatus) => void,
    ): Promise<{ sound: Sound }> => {
      const player = createAudioPlayer(source, { updateInterval: 250 });
      if (onStatus) {
        player.addListener('playbackStatusUpdate', (s) => {
          onStatus(
            s.isLoaded
              ? {
                  isLoaded: true,
                  isPlaying: s.playing,
                  positionMillis: Math.round(s.currentTime * 1000),
                  durationMillis: s.duration > 0 ? Math.round(s.duration * 1000) : undefined,
                  didJustFinish: s.didJustFinish,
                }
              : { isLoaded: false },
          );
        });
      }
      if (options.shouldPlay) player.play();
      const sound: Sound = {
        playAsync: async () => player.play(),
        pauseAsync: async () => player.pause(),
        setPositionAsync: async (millis) => player.seekTo(millis / 1000),
        unloadAsync: async () => player.remove(),
      };
      return { sound };
    },
  },
};

export { Audio };
