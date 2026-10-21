import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import type { PlaybackHandle, PlaybackState } from './PlaybackHost';
import {
  LinearResampler,
  PcmChunker,
  VOICE_INPUT_SAMPLE_RATE,
  int16ToBase64,
} from './pcm';
import {
  VOICE_OUTPUT_SAMPLE_RATE,
  errorMessageOf,
  isAssistantTranscriptDelta,
  isAssistantTranscriptDone,
  isAudioDelta,
  type VoiceClientMessage,
  type VoiceServerMessage,
} from './protocol';
import { TurnGate } from './turnGate';

export type StreamingVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export type VoiceConnection = {
  /** Full realtime URL, already carrying whatever session token the backend issued. */
  url: string;
  instructions?: string;
  voice?: string;
};

const MIC_STALL_MS = 4000;

// iOS resets the audio session when the mic stream starts, which silences playback unless the
// mode is applied again afterwards. Measured on device in the Expo Go spike.
const DUPLEX_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',
  shouldRouteThroughEarpiece: false,
} as const;

export function useStreamingVoice(playback: RefObject<PlaybackHandle | null>) {
  const [status, setStatusState] = useState<StreamingVoiceStatus>('idle');
  const [userText, setUserText] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<StreamingVoiceStatus>('idle');
  const socketRef = useRef<WebSocket | null>(null);
  const gateRef = useRef(new TurnGate());
  const chunkerRef = useRef(new PcmChunker());
  const resamplerRef = useRef<LinearResampler | null>(null);
  const micActiveRef = useRef(false);
  const lastMicAtRef = useRef(0);
  const playbackActiveRef = useRef(false);
  const responseOpenRef = useRef(false);
  const cancellingRef = useRef(false);

  const setStatus = useCallback((next: StreamingVoiceStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const send = useCallback((message: VoiceClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  const { stream } = useAudioStream({
    sampleRate: VOICE_INPUT_SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (!micActiveRef.current) return;
      const now = Date.now();
      lastMicAtRef.current = now;
      let samples: Int16Array = new Int16Array(buffer.data);
      if (buffer.sampleRate !== VOICE_INPUT_SAMPLE_RATE) {
        if (!resamplerRef.current || resamplerRef.current.fromRate !== buffer.sampleRate) {
          resamplerRef.current = new LinearResampler(buffer.sampleRate, VOICE_INPUT_SAMPLE_RATE);
        }
        samples = resamplerRef.current.process(samples);
      }
      for (const chunk of chunkerRef.current.push(samples)) {
        if (!gateRef.current.canSendMic(now)) continue;
        send({ type: 'input_audio_buffer.append', audio: int16ToBase64(chunk) });
      }
    },
  });

  const stopMic = useCallback(() => {
    micActiveRef.current = false;
    try {
      stream.stop();
    } catch {
      // already stopped
    }
    chunkerRef.current.reset();
    resamplerRef.current = null;
  }, [stream]);

  const startMic = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission was denied.');
    chunkerRef.current.reset();
    resamplerRef.current = null;
    micActiveRef.current = true;
    lastMicAtRef.current = Date.now();
    await stream.start();
    await setAudioModeAsync(DUPLEX_AUDIO_MODE);
  }, [stream]);

  const afterTurn = useCallback(() => {
    if (!responseOpenRef.current && !playbackActiveRef.current && socketRef.current) {
      setStatus('listening');
    }
  }, [setStatus]);

  const onPlaybackState = useCallback(
    (state: PlaybackState) => {
      playbackActiveRef.current = state === 'playing';
      gateRef.current.playback(state, Date.now());
      if (state === 'idle') afterTurn();
    },
    [afterTurn],
  );

  const handleMessage = useCallback(
    (message: VoiceServerMessage) => {
      const now = Date.now();
      const gate = gateRef.current;
      const type = message.type;

      if (isAudioDelta(type)) {
        if (cancellingRef.current) return;
        responseOpenRef.current = true;
        gate.audioDelta(now);
        setStatus('speaking');
        const delta = typeof message.delta === 'string' ? message.delta : '';
        if (delta) playback.current?.enqueue(delta, VOICE_OUTPUT_SAMPLE_RATE);
        return;
      }
      if (isAssistantTranscriptDelta(type)) {
        if (cancellingRef.current) return;
        const delta = typeof message.delta === 'string' ? message.delta : '';
        setAssistantText((current) => current + delta);
        return;
      }
      if (isAssistantTranscriptDone(type)) {
        if (cancellingRef.current) return;
        if (typeof message.transcript === 'string') setAssistantText(message.transcript);
        return;
      }

      switch (type) {
        case 'input_audio_buffer.speech_started':
          setStatus('listening');
          break;
        case 'input_audio_buffer.speech_stopped':
          gate.userTurnEnded(now);
          setStatus('thinking');
          break;
        case 'conversation.item.input_audio_transcription.delta':
          setUserText(typeof message.delta === 'string' ? message.delta : '');
          break;
        case 'conversation.item.input_audio_transcription.completed':
          setUserText(typeof message.transcript === 'string' ? message.transcript : '');
          gate.userTurnEnded(now);
          setStatus('thinking');
          break;
        case 'response.created':
          cancellingRef.current = false;
          responseOpenRef.current = true;
          gate.responseStarted(now);
          setAssistantText('');
          setStatus('thinking');
          break;
        case 'response.done':
          responseOpenRef.current = false;
          cancellingRef.current = false;
          gate.responseDone(now);
          afterTurn();
          break;
        case 'error':
          setError(errorMessageOf(message));
          break;
        default:
          break;
      }
    },
    [afterTurn, playback, setStatus],
  );

  const stop = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
    stopMic();
    playback.current?.flush();
    gateRef.current.reset();
    playbackActiveRef.current = false;
    responseOpenRef.current = false;
    cancellingRef.current = false;
    setStatus('idle');
  }, [playback, setStatus, stopMic]);

  const fail = useCallback(
    (message: string) => {
      stop();
      setError(message);
      setStatus('error');
    },
    [setStatus, stop],
  );

  const start = useCallback(
    async (connection: VoiceConnection) => {
      if (socketRef.current) return;
      setError(null);
      setUserText('');
      setAssistantText('');
      setStatus('connecting');
      try {
        const ready = await playback.current?.ensureReady();
        if (!ready) throw new Error('Audio output did not start.');
        const socket = new WebSocket(connection.url);
        socketRef.current = socket;
        socket.onerror = () => fail('Could not reach the voice server.');
        socket.onclose = () => {
          if (socketRef.current === socket) fail('The voice connection closed.');
        };
        socket.onmessage = (event) => {
          let message: VoiceServerMessage;
          try {
            message = JSON.parse(String(event.data)) as VoiceServerMessage;
          } catch {
            return;
          }
          if (message.type === 'session.created') {
            send({
              type: 'session.update',
              session: {
                type: 'realtime',
                instructions: connection.instructions,
                audio: connection.voice ? { output: { voice: connection.voice } } : undefined,
              },
            });
            startMic()
              .then(() => {
                if (socketRef.current === socket) setStatus('listening');
              })
              .catch((e: unknown) => fail(e instanceof Error ? e.message : 'Microphone failed.'));
            return;
          }
          handleMessage(message);
        };
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Could not start the voice session.');
      }
    },
    [fail, handleMessage, playback, send, setStatus, startMic],
  );

  /** Tap to talk over her: stops playback, cancels the reply and hands the floor back. */
  const interrupt = useCallback(() => {
    if (statusRef.current !== 'speaking' && statusRef.current !== 'thinking') return;
    cancellingRef.current = true;
    responseOpenRef.current = false;
    send({ type: 'response.cancel' });
    playback.current?.flush();
    playbackActiveRef.current = false;
    gateRef.current.interrupted(Date.now());
    setStatus('listening');
  }, [playback, send, setStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (micActiveRef.current && Date.now() - lastMicAtRef.current > MIC_STALL_MS) {
        fail('The microphone stopped delivering audio.');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [fail]);

  // Always call the latest stop(); its identity depends on the audio stream object.
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopRef.current();
    });
    return () => {
      sub.remove();
      stopRef.current();
    };
  }, []);

  return { status, userText, assistantText, error, start, stop, interrupt, onPlaybackState };
}
