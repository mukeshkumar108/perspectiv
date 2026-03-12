import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { VoiceOrbVisualizer } from '@/src/components/VoiceOrbVisualizer';
import {
  useEndVoiceSession,
  useStartVoiceSession,
  useSubmitVoiceTurn,
} from '@/src/hooks';
import {
  ApiError,
  type VoiceChoice,
  type VoiceFlow,
  type VoiceInputMode,
  type VoiceReflectionTrack,
} from '@/src/api';
import {
  buildVoiceEndPayload,
  FINALIZE_RETRY_DELAYS_MS,
  getEndErrorAction,
  getTalkActionState,
  getVoiceOrbState,
  shouldRetryFinalize,
  shouldWaitForHandshakePlayback,
} from '@/src/voice/sessionLogic';

type Message = {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'typing';
  text: string;
};

type AssistantInputHints = {
  inputMode?: VoiceInputMode;
  choices?: VoiceChoice[] | null;
};

type FlowOption = {
  id: 'onboarding' | 'first_reflection_day0' | 'first_reflection_core';
  title: string;
  subtitle: string;
  flow: VoiceFlow;
  reflectionTrack?: VoiceReflectionTrack;
};

const FLOW_OPTIONS: FlowOption[] = [
  {
    id: 'onboarding',
    title: 'Onboarding',
    subtitle: 'Collect profile details and setup preferences.',
    flow: 'onboarding',
  },
  {
    id: 'first_reflection_day0',
    title: 'First Reflection Day0',
    subtitle: 'Run the Day0 first-reflection intro and prompt.',
    flow: 'first_reflection',
    reflectionTrack: 'day0',
  },
  {
    id: 'first_reflection_core',
    title: 'Reflection Core',
    subtitle: 'Run the default core reflection handshake and prompt.',
    flow: 'first_reflection',
    reflectionTrack: 'core',
  },
];

const VOICE_STAGED_TURNS_ENABLED = (() => {
  const value = (process.env.EXPO_PUBLIC_VOICE_STAGED_TURNS_ENABLED || '1')
    .trim()
    .toLowerCase();
  return value !== '0' && value !== 'false';
})();

function createClientId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createUuid(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function VoiceSessionScreen() {
  const theme = useTheme();
  const router = useRouter();

  const startMutation = useStartVoiceSession();
  const turnMutation = useSubmitVoiceTurn();
  const endMutation = useEndVoiceSession();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const startedAtMsRef = useRef<number | null>(null);

  const [selectedFlowOptionId, setSelectedFlowOptionId] = useState<FlowOption['id'] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'orb' | 'transcript'>('orb');
  const [isRecording, setIsRecording] = useState(false);
  const [isHandshakePending, setIsHandshakePending] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [isPreSpeakBurst, setIsPreSpeakBurst] = useState(false);
  const [activeInputMode, setActiveInputMode] = useState<VoiceInputMode>('voice');
  const [activeChoices, setActiveChoices] = useState<VoiceChoice[]>([]);
  const [textInputValue, setTextInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [endHint, setEndHint] = useState<string | null>(null);
  const [safeResponse, setSafeResponse] = useState<{
    message: string;
    resources: Array<{ label: string; value: string }>;
  } | null>(null);
  const selectedFlowOption = useMemo(
    () => FLOW_OPTIONS.find((option) => option.id === selectedFlowOptionId) ?? null,
    [selectedFlowOptionId],
  );

  const isBusy =
    startMutation.isPending || turnMutation.isPending || endMutation.isPending;
  const talkAction = getTalkActionState({
    sessionId,
    isBusy,
    isRecording,
    isHandshakePending,
    isAssistantSpeaking,
  });
  const orbState = getVoiceOrbState({
    sessionId,
    isRecording,
    isAssistantThinking,
    isAssistantSpeaking,
    isHandshakePending,
    isPreSpeakBurst,
  });

  const footerStatus = useMemo(() => {
    if (startMutation.isPending) {
      return { label: 'Starting session...', spinner: true };
    }
    if (isHandshakePending) {
      return { label: 'Playing intro...', spinner: true };
    }
    if (isAssistantThinking || turnMutation.isPending) {
      return { label: 'Assistant thinking...', spinner: true };
    }
    if (isPreSpeakBurst) {
      return { label: 'Preparing voice...', spinner: true };
    }
    if (isAssistantSpeaking) {
      return { label: 'Assistant speaking...', spinner: true };
    }
    if (isRecording) {
      return { label: 'Recording...', spinner: false };
    }
    if (sessionId) {
      if (activeInputMode === 'text') {
        return { label: 'Type your response and send', spinner: false };
      }
      if (activeInputMode === 'choice') {
        return { label: 'Choose an option to continue', spinner: false };
      }
      return { label: 'Press to talk when ready', spinner: false };
    }
    if (selectedFlowOption) {
      return {
        label: `${selectedFlowOption.title} selected`,
        spinner: false,
      };
    }
    return { label: 'Choose a flow to begin', spinner: false };
  }, [
    isAssistantSpeaking,
    isAssistantThinking,
    isHandshakePending,
    isPreSpeakBurst,
    isRecording,
    activeInputMode,
    selectedFlowOption,
    sessionId,
    startMutation.isPending,
    turnMutation.isPending,
  ]);

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const cleanupAudio = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // Ignore cleanup errors from already-stopped recorders.
      }
      recordingRef.current = null;
    }
    if (soundRef.current) {
      try {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore cleanup errors from already-unloaded sounds.
      }
      soundRef.current = null;
    }
    setIsAssistantSpeaking(false);
    setIsAssistantThinking(false);
    setIsPreSpeakBurst(false);
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      void cleanupAudio();
    };
  }, [cleanupAudio]);

  const appendMessage = useCallback((role: Message['role'], text: string) => {
    const id = createClientId(role);
    setMessages((prev) => [
      ...prev,
      {
        id,
        role,
        text,
      },
    ]);
    return id;
  }, []);

  const updateMessageText = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              text,
            }
          : message,
      ),
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  }, []);

  const applyAssistantInputHints = useCallback((assistant?: AssistantInputHints) => {
    const nextMode = assistant?.inputMode ?? 'voice';
    const nextChoices =
      nextMode === 'choice' ? assistant?.choices?.filter(Boolean) ?? [] : [];
    setActiveInputMode(nextMode);
    setActiveChoices(nextChoices);
    if (nextMode !== 'text') {
      setTextInputValue('');
    }
  }, []);

  const playAssistantAudio = useCallback(
    async (
      audioUrl: string | null,
      options?: {
        awaitCompletion?: boolean;
        onPlaybackStart?: (meta: { durationMs: number | null }) => void;
      },
    ) => {
      if (!audioUrl) {
        options?.onPlaybackStart?.({ durationMs: null });
        return;
      }
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        if (soundRef.current) {
          soundRef.current.setOnPlaybackStatusUpdate(null);
          await soundRef.current.unloadAsync();
        }
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        const initialDurationMs =
          status && 'isLoaded' in status && status.isLoaded
            ? status.durationMillis ?? null
            : null;
        setIsAssistantSpeaking(true);

        let startNotified = false;
        const notifyPlaybackStart = (durationMs: number | null) => {
          if (startNotified) return;
          startNotified = true;
          options?.onPlaybackStart?.({ durationMs });
        };

        const waitForPlayback = new Promise<void>((resolve) => {
          let settled = false;
          const startFallbackTimeout = setTimeout(() => {
            notifyPlaybackStart(initialDurationMs);
          }, 1_200);
          const settle = () => {
            if (settled) return;
            settled = true;
            clearTimeout(startFallbackTimeout);
            sound.setOnPlaybackStatusUpdate(null);
            setIsAssistantSpeaking(false);
            resolve();
          };

          const handlePlaybackStatus = (statusUpdate: any) => {
            if (!statusUpdate?.isLoaded) {
              settle();
              return;
            }
            if (
              statusUpdate.isPlaying ||
              (typeof statusUpdate.positionMillis === 'number' &&
                statusUpdate.positionMillis > 0)
            ) {
              notifyPlaybackStart(statusUpdate.durationMillis ?? initialDurationMs);
            }
            if (statusUpdate.didJustFinish) {
              settle();
            }
          };

          sound.setOnPlaybackStatusUpdate(handlePlaybackStatus);
          handlePlaybackStatus(status);
          setTimeout(settle, 45_000);
        });
        if (options?.awaitCompletion) {
          await waitForPlayback;
        }
      } catch {
        options?.onPlaybackStart?.({ durationMs: null });
        setIsAssistantSpeaking(false);
        appendMessage('system', 'Audio playback unavailable; showing text only.');
      }
    },
    [appendMessage],
  );

  const presentAssistantMessage = useCallback(
    async (payload: {
      text: string;
      audioUrl: string | null;
      ttsAvailable: boolean;
      awaitPlaybackCompletion?: boolean;
      fallbackLabel?: string;
    }) => {
      const typingFrames = ['.', '..', '...'];
      const typingId = appendMessage('typing', typingFrames[2]);
      setIsAssistantThinking(true);
      let typingIndex = 0;
      let typingStopped = false;
      const typingTimer = setInterval(() => {
        typingIndex = (typingIndex + 1) % typingFrames.length;
        updateMessageText(typingId, typingFrames[typingIndex]);
      }, 260);
      const stopTypingIndicator = () => {
        if (typingStopped) return;
        typingStopped = true;
        clearInterval(typingTimer);
        removeMessage(typingId);
        setIsAssistantThinking(false);
      };

      if (!payload.ttsAvailable) {
        appendMessage(
          'system',
          payload.fallbackLabel || 'Assistant audio unavailable. Continuing in text.',
        );
      }

      if (payload.audioUrl && payload.ttsAvailable) {
        setIsPreSpeakBurst(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 80));
        setIsPreSpeakBurst(false);
      }

      let resolvePlaybackStart: ((meta: { durationMs: number | null }) => void) | null =
        null;
      const playbackStartPromise = new Promise<{ durationMs: number | null }>(
        (resolve) => {
          resolvePlaybackStart = resolve;
        },
      );
      const playPromise = playAssistantAudio(payload.audioUrl, {
        awaitCompletion: payload.awaitPlaybackCompletion,
        onPlaybackStart: (meta) => {
          resolvePlaybackStart?.(meta);
          resolvePlaybackStart = null;
        },
      });

      const words = payload.text.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        stopTypingIndicator();
        const assistantId = appendMessage('assistant', '');
        updateMessageText(assistantId, payload.text);
      } else {
        const playbackMeta =
          payload.audioUrl && payload.ttsAvailable
            ? await Promise.race([
                playbackStartPromise,
                new Promise<{ durationMs: number | null }>((resolve) =>
                  setTimeout(() => resolve({ durationMs: null }), 1_200),
                ),
              ])
            : { durationMs: null };
        stopTypingIndicator();
        const assistantId = appendMessage('assistant', '');
        const totalDuration =
          playbackMeta.durationMs && playbackMeta.durationMs > 0
            ? Math.min(14_000, Math.max(750, Math.floor(playbackMeta.durationMs * 0.9)))
            : Math.min(2_200, Math.max(580, words.length * 88));
        const perWordDelay = totalDuration / Math.max(1, words.length);
        for (let index = 0; index < words.length; index += 1) {
          updateMessageText(assistantId, words.slice(0, index + 1).join(' '));
          const word = words[index] ?? '';
          const extraPause = /[.!?]["']?$/.test(word)
            ? Math.min(110, Math.floor(perWordDelay * 0.45))
            : /[,;:]["']?$/.test(word)
              ? Math.min(60, Math.floor(perWordDelay * 0.25))
              : 0;
          const waitMs = Math.max(28, Math.floor(perWordDelay + extraPause));
          // Keep this reveal lightweight and deterministic.
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        }
        updateMessageText(assistantId, payload.text);
      }

      if (payload.awaitPlaybackCompletion) {
        await playPromise;
      }
      stopTypingIndicator();
    },
    [appendMessage, playAssistantAudio, removeMessage, updateMessageText],
  );

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }, []);

  const finalizeTurnWithRetry = useCallback(
    async (turnParams: {
      sessionId: string;
      clientTurnId: string;
      locale: string;
      deviceTs: string;
    }) => {
      for (let attempt = 0; attempt <= FINALIZE_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          return await turnMutation.mutateAsync({
            sessionId: turnParams.sessionId,
            clientTurnId: turnParams.clientTurnId,
            responseMode: 'finalize',
            locale: turnParams.locale,
            deviceTs: turnParams.deviceTs,
          });
        } catch (error) {
          const canRetry = shouldRetryFinalize(error, attempt);
          if (!canRetry) {
            throw error;
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(FINALIZE_RETRY_DELAYS_MS[attempt]);
        }
      }
      throw new ApiError(503, 'Finalize failed after retries', 'turn_finalize_failed');
    },
    [turnMutation, wait],
  );

  const applyAssistantTurn = useCallback(
    async (response: {
      session: Record<string, unknown>;
      turn: {
        assistant?: {
          text: string;
          audioUrl: string | null;
          ttsAvailable: boolean;
          inputMode?: VoiceInputMode;
          choices?: VoiceChoice[] | null;
        };
        safety?: {
          safeResponse?: {
            message: string;
            resources: Array<{ label: string; value: string }>;
          } | null;
        };
      };
    }) => {
      setEndHint(null);
      setSafeResponse(response.turn.safety?.safeResponse ?? null);

      if (!response.turn.assistant) {
        appendMessage('system', 'Still processing response. Please try speaking again.');
        return;
      }
      applyAssistantInputHints(response.turn.assistant);
      await presentAssistantMessage({
        text: response.turn.assistant.text,
        audioUrl: response.turn.assistant.audioUrl,
        ttsAvailable: response.turn.assistant.ttsAvailable,
        awaitPlaybackCompletion: false,
        fallbackLabel: 'Assistant audio unavailable. Continuing in text.',
      });
    },
    [appendMessage, applyAssistantInputHints, presentAssistantMessage],
  );

  const handleTurnError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'stt_unintelligible') {
        Alert.alert('Could not catch that', 'Please record again.');
        return;
      }
      if (error.code === 'turn_not_found') {
        Alert.alert('Please retry recording', 'We lost that turn. Record once more.');
        appendMessage('system', 'Please retry recording.');
        return;
      }
      if (error.code === 'session_expired') {
        Alert.alert('Session expired', 'Starting a fresh voice session is required.');
        setSessionId(null);
        setIsHandshakePending(false);
        setIsAssistantSpeaking(false);
        setIsAssistantThinking(false);
        setIsPreSpeakBurst(false);
        setActiveInputMode('voice');
        setActiveChoices([]);
        setTextInputValue('');
        return;
      }
      Alert.alert('Turn failed', error.message);
      return;
    }
    Alert.alert('Turn failed', 'Please try again.');
  }, [appendMessage]);

  const handleStartSession = async () => {
    if (!selectedFlowOption) return;
    setSafeResponse(null);
    setEndHint(null);
    setViewMode('orb');
    setIsHandshakePending(false);
    setIsAssistantSpeaking(false);
    setIsAssistantThinking(false);
    setIsPreSpeakBurst(false);
    setActiveInputMode('voice');
    setActiveChoices([]);
    setTextInputValue('');
    setMessages([]);

    try {
      const result = await startMutation.mutateAsync({
        flow: selectedFlowOption.flow,
        clientSessionId: createUuid(),
        dateLocal:
          selectedFlowOption.flow === 'first_reflection'
            ? getLocalDateKey()
            : undefined,
        reflectionTrack: selectedFlowOption.reflectionTrack,
        locale: 'en-US',
      });
      setSessionId(result.session.id);
      setEndHint(null);
      const shouldWaitForHandshake = shouldWaitForHandshakePlayback(
        selectedFlowOption.flow,
        result.assistant,
      );
      setIsHandshakePending(shouldWaitForHandshake);
      applyAssistantInputHints(result.assistant);
      await presentAssistantMessage({
        text: result.assistant.text,
        audioUrl: result.assistant.audioUrl,
        ttsAvailable: result.assistant.ttsAvailable,
        awaitPlaybackCompletion: shouldWaitForHandshake,
        fallbackLabel: 'Voice playback unavailable. Text mode active.',
      });
      setIsHandshakePending(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not start voice session.';
      Alert.alert('Start failed', message);
      setIsHandshakePending(false);
      setIsAssistantSpeaking(false);
      setIsAssistantThinking(false);
      setIsPreSpeakBurst(false);
      setActiveInputMode('voice');
      setActiveChoices([]);
    }
  };

  const beginRecording = async () => {
    if (
      !sessionId ||
      activeInputMode !== 'voice' ||
      isBusy ||
      isHandshakePending ||
      isAssistantSpeaking
    ) {
      return;
    }
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission needed', 'Allow microphone access to use voice sessions.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      startedAtMsRef.current = Date.now();
      setIsRecording(true);
    } catch {
      Alert.alert('Recording failed', 'Could not start recording. Please try again.');
    }
  };

  const stopAndSendTurn = async () => {
    if (!sessionId || !recordingRef.current) return;

    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      Alert.alert('Recording error', 'Could not finalize recording.');
      return;
    }

    const uri = recording.getURI();
    if (!uri) {
      Alert.alert('Recording error', 'No audio captured. Please try again.');
      return;
    }

    const elapsedMs = startedAtMsRef.current
      ? Math.max(1, Date.now() - startedAtMsRef.current)
      : undefined;
    startedAtMsRef.current = null;

    const clientTurnId = createUuid();
    const locale = 'en-US';
    const deviceTs = new Date().toISOString();

    if (!VOICE_STAGED_TURNS_ENABLED) {
      try {
        const response = await turnMutation.mutateAsync({
          sessionId,
          clientTurnId,
          responseMode: 'final',
          audioUri: uri,
          audioMimeType: 'audio/x-m4a',
          audioDurationMs: elapsedMs,
          locale,
          deviceTs,
        });
        appendMessage('user', response.turn.userTranscript.text);
        await applyAssistantTurn(response);
      } catch (error) {
        handleTurnError(error);
      }
      return;
    }

    try {
      const stagedResponse = await turnMutation.mutateAsync({
        sessionId,
        clientTurnId,
        responseMode: 'staged',
        audioUri: uri,
        audioMimeType: 'audio/x-m4a',
        audioDurationMs: elapsedMs,
        locale,
        deviceTs,
      });

      appendMessage('user', stagedResponse.turn.userTranscript.text);
      setEndHint(null);

      if (stagedResponse.turn.assistantPending === true) {
        const finalized = await finalizeTurnWithRetry({
          sessionId,
          clientTurnId,
          locale,
          deviceTs,
        });
        await applyAssistantTurn(finalized);
        return;
      }

      await applyAssistantTurn(stagedResponse);
    } catch (error) {
      const shouldFallbackToLegacyFinal =
        error instanceof ApiError &&
        error.status === 400 &&
        (error.code === 'validation_error' || !error.code);

      if (shouldFallbackToLegacyFinal) {
        try {
          const fallback = await turnMutation.mutateAsync({
            sessionId,
            clientTurnId,
            responseMode: 'final',
            audioUri: uri,
            audioMimeType: 'audio/x-m4a',
            audioDurationMs: elapsedMs,
            locale,
            deviceTs,
          });
          appendMessage('user', fallback.turn.userTranscript.text);
          await applyAssistantTurn(fallback);
          return;
        } catch (fallbackError) {
          handleTurnError(fallbackError);
          return;
        }
      }

      handleTurnError(error);
    }
  };

  const submitTextTurn = async () => {
    if (!sessionId || isBusy) return;
    const textInput = textInputValue.trim();
    if (!textInput) return;

    const clientTurnId = createUuid();
    const locale = 'en-US';
    const deviceTs = new Date().toISOString();

    setTextInputValue('');
    try {
      const response = await turnMutation.mutateAsync({
        sessionId,
        clientTurnId,
        responseMode: 'final',
        textInput,
        locale,
        deviceTs,
      });
      appendMessage('user', response.turn.userTranscript.text || textInput);
      await applyAssistantTurn(response);
    } catch (error) {
      setTextInputValue(textInput);
      handleTurnError(error);
    }
  };

  const submitChoiceTurn = async (choice: VoiceChoice) => {
    if (!sessionId || isBusy) return;
    const clientTurnId = createUuid();
    const locale = 'en-US';
    const deviceTs = new Date().toISOString();

    try {
      const response = await turnMutation.mutateAsync({
        sessionId,
        clientTurnId,
        responseMode: 'final',
        choiceValue: choice.value,
        locale,
        deviceTs,
      });
      appendMessage('user', response.turn.userTranscript.text || choice.label);
      await applyAssistantTurn(response);
    } catch (error) {
      handleTurnError(error);
    }
  };

  const exitSession = async () => {
    if (!sessionId) {
      router.back();
      return;
    }

    try {
      const ended = await endMutation.mutateAsync(
        buildVoiceEndPayload(sessionId, createUuid(), false),
      );
      if (!ended.session?.id) {
        Alert.alert('Session ended', 'Your voice session has been closed.');
      }

      router.replace('/(main)/(tabs)' as any);
    } catch (error) {
      const action = getEndErrorAction(error);
      if (error instanceof ApiError) {
        console.warn('[voice:end] failed', {
          status: error.status,
          code: action.code ?? error.code,
          message: action.message,
          body: error.details ?? null,
        });
      }
      if (action.kind === 'stay') {
        setEndHint(action.message);
        return;
      }
      Alert.alert(action.title, action.message);
    }
  };

  const safeResponseCard = safeResponse ? (
    <Card style={styles.safeCard}>
      <Text variant="bodyMedium">Support options</Text>
      <Text variant="small" color={theme.textSecondary} style={styles.safeMessage}>
        {safeResponse.message}
      </Text>
      {safeResponse.resources.map((resource) => (
        <View key={`${resource.label}-${resource.value}`} style={styles.safeResource}>
          <Text variant="small">{resource.label}</Text>
          <Text variant="small" color={theme.textSecondary}>
            {resource.value}
          </Text>
        </View>
      ))}
    </Card>
  ) : null;

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
        <Text variant="bodyMedium">Voice Session</Text>
        <View style={styles.headerSpacer} />
      </View>

      {endHint && (
        <Card style={styles.hintCard} variant="subtle">
          <Text variant="small" color={theme.textSecondary}>
            {endHint}
          </Text>
        </Card>
      )}

      {sessionId && (
        <View style={styles.viewToggleRow}>
          <Pressable
            onPress={() => setViewMode('orb')}
            style={[
              styles.viewToggleButton,
              viewMode === 'orb' && {
                backgroundColor: theme.text,
              },
            ]}
            hitSlop={8}
          >
            <Text
              variant="small"
              color={viewMode === 'orb' ? theme.surface : theme.textSecondary}
            >
              Orb
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('transcript')}
            style={[
              styles.viewToggleButton,
              viewMode === 'transcript' && {
                backgroundColor: theme.text,
              },
            ]}
            hitSlop={8}
          >
            <Text
              variant="small"
              color={viewMode === 'transcript' ? theme.surface : theme.textSecondary}
            >
              Transcript
            </Text>
          </Pressable>
        </View>
      )}

      {!sessionId && (
        <View style={styles.flowPicker}>
          {FLOW_OPTIONS.map((option) => {
            const isSelected = selectedFlowOptionId === option.id;
            return (
              <Card
                key={option.id}
                style={[
                  styles.flowOptionCard,
                  {
                    borderColor: isSelected ? theme.text : theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text variant="bodyMedium">{option.title}</Text>
                <Text
                  variant="small"
                  color={theme.textSecondary}
                  style={styles.flowOptionSubtitle}
                >
                  {option.subtitle}
                </Text>
                <View style={styles.flowOptionAction}>
                  <Button
                    title={isSelected ? 'Selected' : 'Select'}
                    variant={isSelected ? 'secondary' : 'ghost'}
                    onPress={() => {
                      setSelectedFlowOptionId(option.id);
                      setMessages([]);
                      setSafeResponse(null);
                      setEndHint(null);
                    }}
                    disabled={isBusy}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {sessionId && viewMode === 'orb' ? (
        <View style={styles.orbMode}>
          <VoiceOrbVisualizer state={orbState} />
          {safeResponseCard ? (
            <View style={styles.orbSafeWrap}>{safeResponseCard}</View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToLatest}
        >
          {messages.map((message, index) => {
            const previous = index > 0 ? messages[index - 1] : null;
            const currentSide = message.role === 'user' ? 'user' : 'assistant';
            const previousSide =
              previous && previous.role === 'user' ? 'user' : 'assistant';
            const roleSwitched = Boolean(
              previous &&
                message.role !== 'system' &&
                previous.role !== 'system' &&
                currentSide !== previousSide,
            );

            return (
              <Card
                key={message.id}
                style={[
                  styles.messageCard,
                  roleSwitched && styles.turnGap,
                  message.role === 'user'
                    ? styles.userMessageCard
                    : styles.assistantMessageCard,
                  message.role === 'system' && styles.systemMessageCard,
                  message.role === 'typing' && styles.typingMessageCard,
                ]}
              >
                <Text variant="small" color={theme.textTertiary} style={styles.speakerLabel}>
                  {message.role === 'assistant' || message.role === 'typing'
                    ? 'Assistant'
                    : message.role === 'user'
                      ? 'You'
                      : 'System'}
                </Text>
                <Text variant="body" style={styles.messageText}>
                  {message.text}
                </Text>
              </Card>
            );
          })}

          {safeResponseCard}
        </ScrollView>
      )}

      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.footerStatusRow}>
          {footerStatus.spinner ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <View style={styles.footerStatusDot} />
          )}
          <Text variant="small" color={theme.textSecondary}>
            {footerStatus.label}
          </Text>
        </View>
        {!sessionId && (
          <View style={styles.controls}>
            <Button
              title="Start session"
              onPress={handleStartSession}
              disabled={isBusy || !selectedFlowOption}
            />
            {selectedFlowOption && (
              <Button
                title="Clear selection"
                variant="ghost"
                onPress={() => {
                  setSelectedFlowOptionId(null);
                  setEndHint(null);
                }}
                disabled={isBusy}
              />
            )}
          </View>
        )}
        {sessionId && (
          <View style={styles.controls}>
            {activeInputMode === 'voice' && (
              <Button
                title={talkAction.title}
                onPress={isRecording ? stopAndSendTurn : beginRecording}
                disabled={talkAction.disabled}
                icon={
                  isRecording ? (
                    <Square size={18} color={theme.surface} />
                  ) : (
                    <Mic size={18} color={theme.surface} />
                  )
                }
              />
            )}
            {activeInputMode === 'text' && (
              <View style={styles.textComposer}>
                <RNTextInput
                  style={[
                    styles.textComposerInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.surface,
                    },
                  ]}
                  placeholder="Type your response..."
                  placeholderTextColor={theme.textTertiary}
                  value={textInputValue}
                  onChangeText={setTextInputValue}
                  editable={!isBusy}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Button
                  title="Send"
                  onPress={submitTextTurn}
                  disabled={isBusy || textInputValue.trim().length === 0}
                />
              </View>
            )}
            {activeInputMode === 'choice' && (
              <View style={styles.choiceComposer}>
                {activeChoices.length > 0 ? (
                  <View style={styles.choiceWrap}>
                    {activeChoices.map((choice) => (
                      <Pressable
                        key={choice.value}
                        onPress={() => submitChoiceTurn(choice)}
                        disabled={isBusy}
                        style={[
                          styles.choiceChip,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                            opacity: isBusy ? 0.55 : 1,
                          },
                        ]}
                      >
                        <Text variant="small">{choice.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text variant="small" color={theme.textSecondary}>
                    Waiting for options...
                  </Text>
                )}
              </View>
            )}
            <View style={styles.secondaryControls}>
              <Button
                title="Exit"
                variant="ghost"
                onPress={exitSession}
                disabled={isBusy}
              />
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
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
    marginBottom: spacing.sm,
  },
  headerSpacer: {
    width: 22,
  },
  hintCard: {
    marginBottom: spacing.md,
  },
  viewToggleRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(35, 30, 21, 0.08)',
  },
  viewToggleButton: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  flowPicker: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orbMode: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSafeWrap: {
    width: '100%',
    marginTop: spacing.md,
  },
  flowOptionCard: {
    gap: spacing.xs,
  },
  flowOptionSubtitle: {
    marginTop: spacing.xs,
  },
  flowOptionAction: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  messageCard: {
    gap: spacing.xs,
    maxWidth: '88%',
    borderRadius: 18,
  },
  turnGap: {
    marginTop: spacing.md,
  },
  assistantMessageCard: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 32,
  },
  userMessageCard: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 32,
  },
  systemMessageCard: {
    alignSelf: 'center',
    maxWidth: '94%',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  typingMessageCard: {
    minWidth: 88,
  },
  speakerLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    opacity: 0.78,
  },
  messageText: {
    marginTop: spacing.xs,
  },
  safeCard: {
    gap: spacing.sm,
    borderColor: 'rgba(190, 64, 64, 0.25)',
    borderWidth: 1,
  },
  safeMessage: {
    marginTop: spacing.xs,
  },
  safeResource: {
    gap: spacing.xs,
  },
  controls: {
    gap: spacing.sm,
  },
  textComposer: {
    gap: spacing.sm,
  },
  textComposerInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 78,
    maxHeight: 160,
    fontSize: 15,
    lineHeight: 20,
  },
  choiceComposer: {
    gap: spacing.xs,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  choiceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  footerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(35,30,21,0.32)',
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
