import { ApiError } from '../api';
import type { VoiceFlow } from '../api';

export const FINALIZE_RETRY_DELAYS_MS = [250, 500, 1000] as const;
export const FIRST_REFLECTION_DAY0_HANDSHAKE_TEXT = [
  'Welcome to your first real session.',
  'I am sooo excited you are here.',
  "Forget everything, forget the app, forget what you think this is supposed to be — just tell me.",
  'How was today?',
].join('\n');

export function getCompleteActionState(readyToEnd: boolean) {
  return {
    title: readyToEnd ? 'Finish session' : 'Continue',
    disabled: !readyToEnd,
  };
}

export function shouldWaitForHandshakePlayback(
  flow: VoiceFlow,
  assistant: { audioUrl: string | null; ttsAvailable: boolean },
) {
  const requiresHandshakeGate =
    flow === 'onboarding' || flow === 'first_reflection';
  return requiresHandshakeGate && Boolean(assistant.audioUrl);
}

export function getStartAssistantText(
  flow: VoiceFlow,
  assistant: { text: string; audioUrl: string | null },
) {
  if (flow === 'first_reflection' && assistant.audioUrl) {
    return FIRST_REFLECTION_DAY0_HANDSHAKE_TEXT;
  }
  return assistant.text;
}

export function getTalkActionState(params: {
  sessionId: string | null;
  isBusy: boolean;
  isRecording: boolean;
  isHandshakePending: boolean;
  isAssistantSpeaking: boolean;
}) {
  const {
    sessionId,
    isBusy,
    isRecording,
    isHandshakePending,
    isAssistantSpeaking,
  } = params;
  const title = isRecording ? 'Stop and send' : 'Press to talk';
  const disabled =
    !sessionId || isBusy || isHandshakePending || isAssistantSpeaking;
  return { title, disabled };
}

export function shouldRetryFinalize(
  error: unknown,
  attempt: number,
  delays = FINALIZE_RETRY_DELAYS_MS,
) {
  return (
    error instanceof ApiError &&
    error.code === 'turn_finalize_in_progress' &&
    attempt < delays.length
  );
}

export function buildVoiceEndPayload(
  sessionId: string,
  clientEndId: string,
  commit: boolean,
) {
  return {
    sessionId,
    clientEndId,
    reason: commit ? 'user_completed' : 'user_cancelled',
    commit,
  } as const;
}

export function getEndErrorAction(error: unknown): {
  kind: 'stay' | 'alert';
  title: string;
  message: string;
  code?: string;
} {
  if (error instanceof ApiError) {
    const details =
      error.details && typeof error.details === 'object'
        ? (error.details as Record<string, unknown>)
        : null;
    const nested =
      details?.error && typeof details.error === 'object'
        ? (details.error as Record<string, unknown>)
        : null;
    const code =
      typeof nested?.code === 'string'
        ? nested.code
        : typeof details?.code === 'string'
          ? details.code
          : error.code;
    const backendMessage =
      typeof nested?.message === 'string'
        ? nested.message
        : typeof details?.message === 'string'
          ? details.message
          : error.message;

    if (code === 'onboarding_incomplete') {
      return {
        kind: 'stay',
        title: 'Not ready yet',
        message: 'A couple details are still missing. Continue or discard.',
        code,
      };
    }
    if (code === 'session_not_found') {
      return {
        kind: 'alert',
        title: 'Session missing',
        message: 'Session was not found. Please start again.',
        code,
      };
    }
    if (code === 'idempotency_conflict') {
      return {
        kind: 'alert',
        title: 'Request conflict',
        message: 'Session end request conflicted. Try again once.',
        code,
      };
    }
    return {
      kind: 'alert',
      title: 'End failed',
      message: backendMessage || 'Could not end session.',
      code,
    };
  }

  return {
    kind: 'alert',
    title: 'End failed',
    message: 'Could not end session.',
  };
}
