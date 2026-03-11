import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import {
  useEndVoiceSession,
  useStartVoiceSession,
  useSubmitVoiceTurn,
} from '@/src/hooks';
import { ApiError, type VoiceFlow } from '@/src/api';
import {
  buildVoiceEndPayload,
  FINALIZE_RETRY_DELAYS_MS,
  getStartAssistantText,
  getCompleteActionState,
  getEndErrorAction,
  getTalkActionState,
  shouldRetryFinalize,
  shouldWaitForHandshakePlayback,
} from '@/src/voice/sessionLogic';

type Message = {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'typing';
  text: string;
};

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

  const [selectedFlow, setSelectedFlow] = useState<VoiceFlow | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandshakePending, setIsHandshakePending] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [readyToEnd, setReadyToEnd] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [endHint, setEndHint] = useState<string | null>(null);
  const [safeResponse, setSafeResponse] = useState<{
    message: string;
    resources: Array<{ label: string; value: string }>;
  } | null>(null);

  const isBusy =
    startMutation.isPending || turnMutation.isPending || endMutation.isPending;
  const completeAction = getCompleteActionState(readyToEnd);
  const talkAction = getTalkActionState({
    sessionId,
    isBusy,
    isRecording,
    isHandshakePending,
    isAssistantSpeaking,
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
    if (isAssistantSpeaking) {
      return { label: 'Assistant speaking...', spinner: true };
    }
    if (isRecording) {
      return { label: 'Recording...', spinner: false };
    }
    if (sessionId && readyToEnd) {
      return { label: 'Ready to complete', spinner: false };
    }
    if (sessionId) {
      return { label: 'Press to talk when ready', spinner: false };
    }
    if (selectedFlow) {
      return {
        label: selectedFlow === 'onboarding' ? 'Onboarding selected' : 'First reflection selected',
        spinner: false,
      };
    }
    return { label: 'Choose a flow to begin', spinner: false };
  }, [
    isAssistantSpeaking,
    isAssistantThinking,
    isHandshakePending,
    isRecording,
    readyToEnd,
    selectedFlow,
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

  const playAssistantAudio = useCallback(
    async (
      audioUrl: string | null,
      options?: {
        awaitCompletion?: boolean;
      },
    ) => {
      if (!audioUrl) return;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        if (soundRef.current) {
          soundRef.current.setOnPlaybackStatusUpdate(null);
          await soundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        setIsAssistantSpeaking(true);
        const waitForPlayback = new Promise<void>((resolve) => {
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            sound.setOnPlaybackStatusUpdate(null);
            setIsAssistantSpeaking(false);
            resolve();
          };

          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (!status?.isLoaded) {
              settle();
              return;
            }
            if (status.didJustFinish) {
              settle();
            }
          });
          setTimeout(settle, 45_000);
        });
        if (options?.awaitCompletion) {
          await waitForPlayback;
        }
      } catch {
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
      const typingId = appendMessage('typing', '...');
      setIsAssistantThinking(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 360));
      removeMessage(typingId);
      setIsAssistantThinking(false);

      if (!payload.ttsAvailable) {
        appendMessage(
          'system',
          payload.fallbackLabel || 'Assistant audio unavailable. Continuing in text.',
        );
      }

      const playPromise = playAssistantAudio(payload.audioUrl, {
        awaitCompletion: payload.awaitPlaybackCompletion,
      });

      const assistantId = appendMessage('assistant', '');
      const words = payload.text.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        updateMessageText(assistantId, payload.text);
      } else {
        const totalDuration = Math.min(2200, Math.max(520, words.length * 95));
        const perWordDelay = Math.max(35, Math.floor(totalDuration / words.length));
        for (let index = 0; index < words.length; index += 1) {
          updateMessageText(assistantId, words.slice(0, index + 1).join(' '));
          // Keep this reveal lightweight and deterministic.
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) =>
            setTimeout(resolve, perWordDelay),
          );
        }
      }

      if (payload.awaitPlaybackCompletion) {
        await playPromise;
      }
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
      session: { readyToEnd?: boolean };
      turn: {
        assistant?: {
          text: string;
          audioUrl: string | null;
          ttsAvailable: boolean;
        };
        safety?: {
          safeResponse?: {
            message: string;
            resources: Array<{ label: string; value: string }>;
          } | null;
        };
      };
    }) => {
      setReadyToEnd(Boolean(response.session.readyToEnd));
      setEndHint(null);
      setSafeResponse(response.turn.safety?.safeResponse ?? null);

      if (!response.turn.assistant) {
        appendMessage('system', 'Still processing response. Please try speaking again.');
        return;
      }
      await presentAssistantMessage({
        text: response.turn.assistant.text,
        audioUrl: response.turn.assistant.audioUrl,
        ttsAvailable: response.turn.assistant.ttsAvailable,
        awaitPlaybackCompletion: false,
        fallbackLabel: 'Assistant audio unavailable. Continuing in text.',
      });
    },
    [appendMessage, presentAssistantMessage],
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
        setReadyToEnd(false);
        setIsHandshakePending(false);
        setIsAssistantSpeaking(false);
        setIsAssistantThinking(false);
        return;
      }
      Alert.alert('Turn failed', error.message);
      return;
    }
    Alert.alert('Turn failed', 'Please try again.');
  }, [appendMessage]);

  const handleStartSession = async () => {
    if (!selectedFlow) return;
    setSafeResponse(null);
    setEndHint(null);
    setIsHandshakePending(false);
    setIsAssistantSpeaking(false);
    setIsAssistantThinking(false);
    setMessages([]);

    try {
      const result = await startMutation.mutateAsync({
        flow: selectedFlow,
        clientSessionId: createUuid(),
        dateLocal:
          selectedFlow === 'first_reflection' ? getLocalDateKey() : undefined,
        locale: 'en-US',
      });
      setSessionId(result.session.id);
      setReadyToEnd(Boolean(result.session.readyToEnd));
      setEndHint(null);
      const shouldWaitForHandshake = shouldWaitForHandshakePlayback(
        selectedFlow,
        result.assistant,
      );
      const startAssistantText = getStartAssistantText(
        selectedFlow,
        result.assistant,
      );
      setIsHandshakePending(shouldWaitForHandshake);
      await presentAssistantMessage({
        text: startAssistantText,
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
    }
  };

  const beginRecording = async () => {
    if (!sessionId || isBusy || isHandshakePending || isAssistantSpeaking) return;
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
      setReadyToEnd(Boolean(stagedResponse.session.readyToEnd));
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

  const endSession = async (commit: boolean) => {
    if (!sessionId) {
      router.back();
      return;
    }
    if (commit && !readyToEnd) {
      setEndHint('A couple details are still missing. Continue or discard.');
      return;
    }

    try {
      const ended = await endMutation.mutateAsync(
        buildVoiceEndPayload(sessionId, createUuid(), commit),
      );

      if (commit && selectedFlow === 'first_reflection') {
        const message =
          ended.result.reflection?.successMessage ||
          'Voice reflection saved.';
        Alert.alert('Done', message);
      } else if (commit && selectedFlow === 'onboarding') {
        Alert.alert('Onboarding complete', 'Voice onboarding has been saved.');
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

      {!sessionId && !selectedFlow && (
        <View style={styles.flowPicker}>
          <Button
            title="Onboarding voice"
            onPress={() => {
              setSelectedFlow('onboarding');
              setMessages([]);
              setSafeResponse(null);
              setEndHint(null);
            }}
            disabled={isBusy}
          />
          <Button
            title="First reflection voice"
            variant="secondary"
            onPress={() => {
              setSelectedFlow('first_reflection');
              setMessages([]);
              setSafeResponse(null);
              setEndHint(null);
            }}
            disabled={isBusy}
          />
        </View>
      )}

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

        {safeResponse && (
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
        )}
      </ScrollView>

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
        {!sessionId && selectedFlow && (
          <View style={styles.controls}>
            <Button
              title="Start session"
              onPress={handleStartSession}
              disabled={isBusy}
            />
            <Button
              title="Change flow"
              variant="ghost"
              onPress={() => {
                setSelectedFlow(null);
                setEndHint(null);
              }}
              disabled={isBusy}
            />
          </View>
        )}
        {sessionId && (
          <View style={styles.controls}>
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
            <View style={styles.secondaryControls}>
              <Button
                title={completeAction.title}
                variant="secondary"
                onPress={() => endSession(true)}
                disabled={isBusy || completeAction.disabled}
              />
              <Button
                title="Discard"
                variant="ghost"
                onPress={() => endSession(false)}
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
  flowPicker: {
    gap: spacing.sm,
    marginBottom: spacing.md,
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
