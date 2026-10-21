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
  rms,
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
  /** Product-owned cue sent as the first user message so the assistant opens the session. */
  opener?: string;
};

const MIC_STALL_MS = 4000;
// Nothing heard from the server or the speaker for this long while she should be answering.
const REPLY_STALL_MS = 15_000;

// iOS resets the audio session when the mic stream starts, which silences playback unless the
// mode is applied again afterwards. Measured on device in the Expo Go spike.
const DUPLEX_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',
  shouldRouteThroughEarpiece: false,
} as const;

const log = (...args: unknown[]) => console.log('[voice]', ...args);

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
  const userTurnOpenRef = useRef(false);
  const cancellingRef = useRef(false);
  const lastActivityRef = useRef(0);
  /** 0..1 level of whatever is audible right now (mic while listening, speaker while speaking). */
  const levelRef = useRef(0);

  const setStatus = useCallback((next: StreamingVoiceStatus) => {
    if (statusRef.current !== next) log('status', statusRef.current, '->', next);
    statusRef.current = next;
    setStatusState(next);
  }, []);

  /** The status is a fact about the phone: speaking only while audio is actually playing. */
  const refreshStatus = useCallback(() => {
    if (!socketRef.current || !micActiveRef.current) return;
    if (playbackActiveRef.current) setStatus('speaking');
    else if (responseOpenRef.current || userTurnOpenRef.current) setStatus('thinking');
    else setStatus('listening');
  }, [setStatus]);

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
      if (statusRef.current === 'listening') levelRef.current = Math.min(1, rms(samples) * 9);
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

  const onPlaybackState = useCallback(
    (state: PlaybackState) => {
      log('playback', state);
      lastActivityRef.current = Date.now();
      playbackActiveRef.current = state === 'playing';
      gateRef.current.playback(state, Date.now());
      if (state === 'idle') levelRef.current = 0;
      refreshStatus();
    },
    [refreshStatus],
  );

  const onPlaybackDiag = useCallback((info: Record<string, unknown>) => {
    log('audio', JSON.stringify(info));
  }, []);

  /** Plays a short beep through the same output path, with no server involved. */
  const testSound = useCallback(async () => {
    const ready = await playback.current?.ensureReady();
    if (!ready) return false;
    await setAudioModeAsync(DUPLEX_AUDIO_MODE);
    const rate = VOICE_OUTPUT_SAMPLE_RATE;
    const samples = new Int16Array(Math.round(rate * 0.7));
    for (let i = 0; i < samples.length; i += 1) {
      const envelope = Math.min(1, i / 400, (samples.length - i) / 400);
      samples[i] = Math.round(Math.sin((2 * Math.PI * 523 * i) / rate) * 0.5 * 32767 * envelope);
    }
    playback.current?.enqueue(int16ToBase64(samples), rate);
    playback.current?.drain();
    return true;
  }, [playback]);

  const onPlaybackLevel = useCallback((level: number) => {
    if (statusRef.current === 'speaking') levelRef.current = Math.min(1, level * 3.2);
  }, []);

  const handleMessage = useCallback(
    (message: VoiceServerMessage) => {
      const now = Date.now();
      lastActivityRef.current = now;
      const gate = gateRef.current;
      const type = message.type;

      if (isAudioDelta(type)) {
        if (cancellingRef.current) return;
        responseOpenRef.current = true;
        gate.audioDelta(now);
        const delta = typeof message.delta === 'string' ? message.delta : '';
        if (delta) playback.current?.enqueue(delta, VOICE_OUTPUT_SAMPLE_RATE);
        refreshStatus();
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
          refreshStatus();
          break;
        case 'input_audio_buffer.speech_stopped':
          userTurnOpenRef.current = true;
          gate.userTurnEnded(now);
          refreshStatus();
          break;
        case 'conversation.item.input_audio_transcription.delta':
          setUserText(typeof message.delta === 'string' ? message.delta : '');
          break;
        case 'conversation.item.input_audio_transcription.completed':
          setUserText(typeof message.transcript === 'string' ? message.transcript : '');
          userTurnOpenRef.current = true;
          gate.userTurnEnded(now);
          refreshStatus();
          break;
        case 'response.created':
          cancellingRef.current = false;
          responseOpenRef.current = true;
          userTurnOpenRef.current = false;
          gate.responseStarted(now);
          setAssistantText('');
          refreshStatus();
          break;
        case 'response.done':
          log('response.done');
          responseOpenRef.current = false;
          userTurnOpenRef.current = false;
          cancellingRef.current = false;
          gate.responseDone(now);
          // Nothing more is coming: start whatever the pre-roll buffer is still holding.
          playback.current?.drain();
          refreshStatus();
          break;
        case 'error':
          log('server error', errorMessageOf(message));
          setError(errorMessageOf(message));
          break;
        default:
          break;
      }
    },
    [playback, refreshStatus],
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
    userTurnOpenRef.current = false;
    cancellingRef.current = false;
    levelRef.current = 0;
    setStatus('idle');
  }, [playback, setStatus, stopMic]);

  const fail = useCallback(
    (message: string) => {
      log('fail', message);
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
            log('session.created');
            lastActivityRef.current = Date.now();
            if (connection.instructions || connection.voice) {
              send({
                type: 'session.update',
                session: {
                  type: 'realtime',
                  instructions: connection.instructions,
                  audio: connection.voice ? { output: { voice: connection.voice } } : undefined,
                },
              });
            }
            startMic()
              .then(() => {
                if (socketRef.current !== socket) return;
                setStatus('listening');
                if (connection.opener) {
                  // The session opens with her: a product-owned cue, answered like any turn.
                  userTurnOpenRef.current = true;
                  gateRef.current.userTurnEnded(Date.now());
                  send({
                    type: 'conversation.item.create',
                    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: connection.opener }] },
                  });
                  send({ type: 'response.create' });
                  refreshStatus();
                }
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
    [fail, handleMessage, playback, refreshStatus, send, setStatus, startMic],
  );

  /** Tap to talk over her: stops playback, cancels the reply and hands the floor back. */
  const interrupt = useCallback(() => {
    if (statusRef.current !== 'speaking' && statusRef.current !== 'thinking') return;
    log('interrupt');
    cancellingRef.current = true;
    responseOpenRef.current = false;
    userTurnOpenRef.current = false;
    send({ type: 'response.cancel' });
    playback.current?.flush();
    playbackActiveRef.current = false;
    levelRef.current = 0;
    gateRef.current.interrupted(Date.now());
    refreshStatus();
  }, [playback, refreshStatus, send]);

  const interruptRef = useRef(interrupt);
  interruptRef.current = interrupt;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (micActiveRef.current && now - lastMicAtRef.current > MIC_STALL_MS) {
        fail('The microphone stopped delivering audio.');
        return;
      }
      // She owes an answer but nothing has arrived or played for a long time: let go and listen.
      if (
        (statusRef.current === 'thinking' || statusRef.current === 'speaking') &&
        now - lastActivityRef.current > REPLY_STALL_MS &&
        !playbackActiveRef.current
      ) {
        log('reply stalled, recovering');
        interruptRef.current();
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

  return {
    status,
    userText,
    assistantText,
    error,
    levelRef,
    start,
    stop,
    interrupt,
    onPlaybackState,
    onPlaybackLevel,
    onPlaybackDiag,
    testSound,
  };
}
