import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  getCompleteActionState,
  getEndErrorAction,
} from '@/src/voice/sessionLogic';

type Message = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
};

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
  const startedAtMsRef = useRef<number | null>(null);

  const [selectedFlow, setSelectedFlow] = useState<VoiceFlow | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  const statusLabel = useMemo(() => {
    if (!selectedFlow) return 'Choose a voice flow to begin';
    if (!sessionId) return 'Start session';
    if (isRecording) return 'Recording... tap stop to send';
    if (turnMutation.isPending) return 'Processing your voice turn...';
    if (readyToEnd) return 'Ready to finish';
    return 'Tap to talk';
  }, [selectedFlow, sessionId, isRecording, turnMutation.isPending, readyToEnd]);

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
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore cleanup errors from already-unloaded sounds.
      }
      soundRef.current = null;
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      void cleanupAudio();
    };
  }, [cleanupAudio]);

  const appendMessage = useCallback((role: Message['role'], text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createClientId(role),
        role,
        text,
      },
    ]);
  }, []);

  const playAssistantAudio = useCallback(
    async (audioUrl: string | null) => {
      if (!audioUrl) return;
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
        );
        soundRef.current = sound;
      } catch {
        appendMessage('system', 'Audio playback unavailable; showing text only.');
      }
    },
    [appendMessage],
  );

  const handleStart = async (flow: VoiceFlow) => {
    setSelectedFlow(flow);
    setSafeResponse(null);
    setEndHint(null);
    setMessages([]);

    try {
      const result = await startMutation.mutateAsync({
        flow,
        clientSessionId: createUuid(),
        dateLocal: flow === 'first_reflection' ? getLocalDateKey() : undefined,
        locale: 'en-US',
      });
      setSessionId(result.session.id);
      setReadyToEnd(Boolean(result.session.readyToEnd));
      setEndHint(null);
      appendMessage('assistant', result.assistant.text);
      if (!result.assistant.ttsAvailable) {
        appendMessage('system', 'Voice playback unavailable. Text mode active.');
      }
      await playAssistantAudio(result.assistant.audioUrl);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not start voice session.';
      Alert.alert('Start failed', message);
      setSelectedFlow(null);
    }
  };

  const beginRecording = async () => {
    if (!sessionId || isBusy) return;
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

    try {
      const response = await turnMutation.mutateAsync({
        sessionId,
        clientTurnId: createUuid(),
        audioUri: uri,
        audioMimeType: 'audio/x-m4a',
        audioDurationMs: elapsedMs,
        locale: 'en-US',
        deviceTs: new Date().toISOString(),
      });

      appendMessage('user', response.turn.userTranscript.text);
      appendMessage('assistant', response.turn.assistant.text);
      setReadyToEnd(Boolean(response.session.readyToEnd));
      setEndHint(null);
      setSafeResponse(response.turn.safety.safeResponse);

      if (!response.turn.assistant.ttsAvailable) {
        appendMessage('system', 'Assistant audio unavailable. Continuing in text.');
      }

      await playAssistantAudio(response.turn.assistant.audioUrl);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'stt_unintelligible') {
          Alert.alert('Could not catch that', 'Please record again.');
          return;
        }
        if (error.code === 'session_expired') {
          Alert.alert('Session expired', 'Starting a fresh voice session is required.');
          setSessionId(null);
          setReadyToEnd(false);
          return;
        }
        Alert.alert('Turn failed', error.message);
        return;
      }
      Alert.alert('Turn failed', 'Please try again.');
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

      <Text variant="small" color={theme.textSecondary} style={styles.status}>
        {statusLabel}
      </Text>
      {endHint && (
        <Card style={styles.hintCard} variant="subtle">
          <Text variant="small" color={theme.textSecondary}>
            {endHint}
          </Text>
        </Card>
      )}

      {!sessionId && (
        <View style={styles.flowPicker}>
          <Button
            title="Start onboarding voice"
            onPress={() => handleStart('onboarding')}
            disabled={isBusy}
          />
          <Button
            title="Start first reflection voice"
            variant="secondary"
            onPress={() => handleStart('first_reflection')}
            disabled={isBusy}
          />
        </View>
      )}

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <Card key={message.id} style={styles.messageCard}>
            <Text variant="caption" color={theme.textTertiary}>
              {message.role === 'assistant'
                ? 'Assistant'
                : message.role === 'user'
                  ? 'You'
                  : 'System'}
            </Text>
            <Text variant="body" style={styles.messageText}>
              {message.text}
            </Text>
          </Card>
        ))}

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

      {sessionId && (
        <View style={styles.controls}>
          <Button
            title={isRecording ? 'Stop and send' : 'Press to talk'}
            onPress={isRecording ? stopAndSendTurn : beginRecording}
            disabled={isBusy}
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
  status: {
    marginBottom: spacing.md,
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
    paddingBottom: spacing.lg,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
