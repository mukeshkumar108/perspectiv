// Client side of sophie-voice's OpenAI-Realtime-style WebSocket (/v1/realtime).

export type VoiceClientMessage =
  | {
      type: 'session.update';
      session: {
        type: 'realtime';
        instructions?: string;
        audio?: { output?: { voice?: string } };
      };
    }
  | { type: 'input_audio_buffer.append'; audio: string }
  | { type: 'input_audio_buffer.commit' | 'response.cancel' }
  | {
      type: 'response.create';
      response: {
        conversation: 'none';
        instructions: string;
        output_modalities: ['audio'];
        tool_choice: 'none';
      };
    };

export type VoiceServerMessage = { type: string; [key: string]: unknown };

/** Sample rate of assistant audio deltas (PCM16 mono), as used by the sophie-mob client. */
export const VOICE_OUTPUT_SAMPLE_RATE = 16_000;

export function isAudioDelta(type: string) {
  return type === 'response.output_audio.delta' || type === 'response.audio.delta';
}

export function isAssistantTranscriptDelta(type: string) {
  return type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta';
}

export function isAssistantTranscriptDone(type: string) {
  return type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done';
}

export function errorMessageOf(message: VoiceServerMessage): string {
  const err = message.error;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Voice server error.';
}
