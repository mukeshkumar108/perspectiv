import { ApiError } from '../src/api';
import {
  buildVoiceEndPayload,
  getCompleteActionState,
  getEndErrorAction,
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
});
