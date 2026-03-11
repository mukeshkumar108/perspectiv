import { ApiError } from '../src/api';
import {
  buildVoiceEndPayload,
  FINALIZE_RETRY_DELAYS_MS,
  FIRST_REFLECTION_DAY0_HANDSHAKE_TEXT,
  getStartAssistantText,
  getCompleteActionState,
  getEndErrorAction,
  getTalkActionState,
  shouldRetryFinalize,
  shouldWaitForHandshakePlayback,
} from '../src/voice/sessionLogic';

describe('voice-session logic', () => {
  it('disables complete action until readyToEnd is true', () => {
    expect(getCompleteActionState(false)).toEqual({
      title: 'Continue',
      disabled: true,
    });
    expect(getCompleteActionState(true)).toEqual({
      title: 'Finish session',
      disabled: false,
    });
  });

  it('builds discard payload with commit=false and user_cancelled reason', () => {
    expect(
      buildVoiceEndPayload(
        'vsn_1',
        'aaaa1111-1111-4111-8111-111111111111',
        false,
      ),
    ).toEqual({
      sessionId: 'vsn_1',
      clientEndId: 'aaaa1111-1111-4111-8111-111111111111',
      reason: 'user_cancelled',
      commit: false,
    });
  });

  it('treats onboarding_incomplete as non-fatal stay-in-session state', () => {
    const err = new ApiError(
      422,
      'Onboarding incomplete',
      'onboarding_incomplete',
      {
        error: {
          code: 'onboarding_incomplete',
          message: 'Complete onboarding first',
        },
      },
    );
    const action = getEndErrorAction(err);
    expect(action.kind).toBe('stay');
    expect(action.code).toBe('onboarding_incomplete');
  });

  it('marks onboarding and first_reflection start with audio as handshake-gated', () => {
    expect(
      shouldWaitForHandshakePlayback('onboarding', {
        audioUrl: 'https://cdn.example.com/hello.mp3',
        ttsAvailable: true,
      }),
    ).toBe(true);
    expect(
      shouldWaitForHandshakePlayback('onboarding', {
        audioUrl: null,
        ttsAvailable: false,
      }),
    ).toBe(false);
    expect(
      shouldWaitForHandshakePlayback('first_reflection', {
        audioUrl: 'https://cdn.example.com/refl.mp3',
        ttsAvailable: true,
      }),
    ).toBe(true);
  });

  it('uses fixed day0 first_reflection text when handshake audio exists', () => {
    expect(
      getStartAssistantText('first_reflection', {
        text: 'backend text',
        audioUrl: 'https://cdn.example.com/day0.mp3',
      }),
    ).toBe(FIRST_REFLECTION_DAY0_HANDSHAKE_TEXT);

    expect(
      getStartAssistantText('first_reflection', {
        text: 'backend text',
        audioUrl: null,
      }),
    ).toBe('backend text');

    expect(
      getStartAssistantText('onboarding', {
        text: 'onboarding hello',
        audioUrl: 'https://cdn.example.com/onboarding.mp3',
      }),
    ).toBe('onboarding hello');
  });

  it('keeps talk disabled while handshake is pending and enables after', () => {
    expect(
      getTalkActionState({
        sessionId: 'vsn_1',
        isBusy: false,
        isRecording: false,
        isHandshakePending: true,
        isAssistantSpeaking: false,
      }),
    ).toEqual({
      title: 'Press to talk',
      disabled: true,
    });

    expect(
      getTalkActionState({
        sessionId: 'vsn_1',
        isBusy: false,
        isRecording: false,
        isHandshakePending: false,
        isAssistantSpeaking: false,
      }),
    ).toEqual({
      title: 'Press to talk',
      disabled: false,
    });
  });

  it('disables talk while assistant is speaking', () => {
    expect(
      getTalkActionState({
        sessionId: 'vsn_1',
        isBusy: false,
        isRecording: false,
        isHandshakePending: false,
        isAssistantSpeaking: true,
      }),
    ).toEqual({
      title: 'Press to talk',
      disabled: true,
    });
  });

  it('retries finalize only for in-progress code within retry window', () => {
    const retryable = new ApiError(
      409,
      'Finalize in progress',
      'turn_finalize_in_progress',
    );
    expect(shouldRetryFinalize(retryable, 0)).toBe(true);
    expect(shouldRetryFinalize(retryable, 1)).toBe(true);
    expect(shouldRetryFinalize(retryable, FINALIZE_RETRY_DELAYS_MS.length)).toBe(
      false,
    );
    expect(
      shouldRetryFinalize(new ApiError(409, 'Other', 'turn_not_found'), 0),
    ).toBe(false);
  });
});
