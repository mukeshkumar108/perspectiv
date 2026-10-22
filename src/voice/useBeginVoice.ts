import { useCallback, useRef } from 'react';
import { useVoiceConnect } from '@/src/hooks';
import type { VoiceConnectFlow } from '@/src/api';
import type { PlaybackHandle } from '@/src/voice/stream/PlaybackHost';
import { useStreamingVoice } from '@/src/voice/stream/useStreamingVoice';

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Starts a spoken session of a given kind. Used by Talk (which chooses the kind) and the Lab (where you choose). */
export function useBeginVoice() {
  const playbackRef = useRef<PlaybackHandle>(null);
  const connect = useVoiceConnect();
  const voice = useStreamingVoice(playbackRef);

  const begin = useCallback(
    async (flow: VoiceConnectFlow) => {
      try {
        const info = await connect.mutateAsync({ flow, timezone: deviceTimezone() });
        const url = `${info.voiceUrl}${info.voiceUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(info.token)}`;
        await voice.start({ url, instructions: info.instructions, voice: info.voice, opener: info.opener });
      } catch {
        // connect errors are shown through errorText
      }
    },
    [connect, voice],
  );

  const live = voice.status !== 'idle' && voice.status !== 'error';
  const errorText = voice.error ?? (connect.error ? connect.error.message : null);
  return { playbackRef, voice, begin, live, errorText, connecting: connect.isPending };
}
