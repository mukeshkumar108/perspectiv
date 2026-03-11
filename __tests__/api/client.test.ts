import { api, ApiError, setOnUnauthorized, setTokenClearer, setTokenGetter } from '../../src/api';
import { clearLogs, getLogs } from '../../src/lib/logger';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    setTokenGetter(async () => 'test-token');
    setOnUnauthorized(() => {});
    setTokenClearer(() => {});
    process.env.EXPO_PUBLIC_API_DEBUG = '1';
    clearLogs();
  });

  describe('getToday', () => {
    it('should fetch today prompt successfully', async () => {
      const mockResponse = {
        prompt: {
          id: '123',
          text: 'What are you grateful for today?',
        },
        hasReflected: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await api.getToday()) as typeof mockResponse;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://b-attic.vercel.app/api/bluum/today',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.prompt.text).toBe('What are you grateful for today?');
      expect(result.hasReflected).toBe(false);
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });

      try {
        await api.getToday();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
        expect(apiError.message).toBe('Unauthorized');
        return;
      }
      throw new Error('Expected ApiError');
    });
  });

  describe('submitReflection', () => {
    it('should submit reflection successfully', async () => {
      const mockResponse = {
        saved: true,
        successMessage: 'Great reflection!',
        reflection: {
          id: '456',
          responseText: 'I am grateful for my family.',
          createdAt: '2024-01-15T12:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await api.submitReflection({
        responseText: 'I am grateful for my family.',
      })) as typeof mockResponse;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://b-attic.vercel.app/api/bluum/reflection',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ responseText: 'I am grateful for my family.' }),
        })
      );
      expect(result.saved).toBe(true);
      expect(result.successMessage).toBe('Great reflection!');
    });

    it('should handle 409 already reflected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ message: 'Already reflected today' }),
      });

      await expect(
        api.submitReflection({ responseText: 'Test' })
      ).rejects.toThrow(ApiError);
    });

    it('should handle safety flagged response', async () => {
      const mockResponse = {
        saved: true,
        safetyFlagged: true,
        message: 'We noticed your message. Are you okay?',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await api.submitReflection({
        responseText: 'Some text',
      })) as typeof mockResponse;

      expect(result.safetyFlagged).toBe(true);
    });
  });

  describe('getStreaks', () => {
    it('should fetch streaks successfully', async () => {
      const mockResponse = {
        currentStreak: 5,
        longestStreak: 10,
        totalReflections: 25,
        lastReflectionDate: '2024-01-15',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = (await api.getStreaks()) as typeof mockResponse;

      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
      expect(result.totalReflections).toBe(25);
    });
  });

  describe('token handling', () => {
    it('should include bearer token in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            currentStreak: 0,
            longestStreak: 0,
            totalReflections: 0,
          }),
      });

      await api.getStreaks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should not log the token value', async () => {
      setTokenGetter(async () => 'abc');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            currentStreak: 0,
            longestStreak: 0,
            totalReflections: 0,
          }),
      });

      await api.getStreaks();

      const logText = JSON.stringify(getLogs());
      expect(logText).not.toContain('abc');
    });

    it('should work without token', async () => {
      setTokenGetter(async () => null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            currentStreak: 0,
            longestStreak: 0,
            totalReflections: 0,
          }),
      });

      await api.getStreaks();

      const callHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(callHeaders.Authorization).toBeUndefined();
    });
  });

  describe('unauthorized handling', () => {
    it('should call onUnauthorized on 401', async () => {
      const onUnauthorized = jest.fn();
      setOnUnauthorized(onUnauthorized);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });

      await expect(api.getToday()).rejects.toThrow(ApiError);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });

  describe('voice session flow', () => {
    it('should use server session.id for end(discard) payload', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_server_123',
                flow: 'onboarding',
                state: 'active',
                dateLocal: null,
                readyToEnd: false,
                nextTurnIndex: 1,
              },
              assistant: {
                text: 'Welcome',
                audioUrl: null,
                audioMimeType: null,
                audioExpiresAt: null,
                ttsAvailable: false,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_server_123',
                state: 'active',
                readyToEnd: true,
                safetyFlagged: false,
                nextTurnIndex: 2,
              },
              turn: {
                id: 'vturn_1',
                index: 1,
                clientTurnId: 'turn-uuid-1',
                userTranscript: { text: 'hello' },
                assistant: {
                  text: 'reply',
                  audioUrl: null,
                  audioMimeType: null,
                  audioExpiresAt: null,
                  ttsAvailable: false,
                },
                safety: {
                  flagged: false,
                  reason: 'none',
                  safeResponse: null,
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_server_123',
                flow: 'onboarding',
                state: 'ended',
              },
              result: {
                reflection: null,
                onboarding: {
                  completed: true,
                  user: {
                    id: 'u_1',
                  },
                },
              },
            }),
        });

      const start = await api.startVoiceSession({
        flow: 'onboarding',
        clientSessionId: '11111111-1111-4111-8111-111111111111',
      });

      expect(start.session.id).toBe('vsn_server_123');
      expect(start.session.dateLocal).toBeNull();

      await api.submitVoiceTurn({
        sessionId: start.session.id,
        clientTurnId: '22222222-2222-4222-8222-222222222222',
        audioUri: 'file:///tmp/turn.m4a',
        audioMimeType: 'audio/x-m4a',
      });

      await api.endVoiceSession({
        sessionId: start.session.id,
        clientEndId: '33333333-3333-4333-8333-333333333333',
        reason: 'user_cancelled',
        commit: false,
      });

      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://b-attic.vercel.app/api/bluum/voice/session/end',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sessionId: 'vsn_server_123',
            clientEndId: '33333333-3333-4333-8333-333333333333',
            reason: 'user_cancelled',
            commit: false,
          }),
        }),
      );
    });

    it('should parse onboarding handshake start response and continue turn loop', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_handshake_1',
                flow: 'onboarding',
                state: 'active',
                dateLocal: null,
                readyToEnd: false,
                nextTurnIndex: 1,
              },
              assistant: {
                text: 'Welcome to onboarding.',
                audioUrl: 'https://cdn.example.com/handshake.mp3',
                audioMimeType: 'audio/mpeg',
                audioExpiresAt: '2026-03-11T10:00:00.000Z',
                ttsAvailable: true,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_handshake_1',
                state: 'active',
                readyToEnd: false,
                safetyFlagged: false,
                nextTurnIndex: 2,
              },
              turn: {
                id: 'vturn_h1',
                index: 1,
                clientTurnId: 'turn-h1',
                userTranscript: { text: 'I am ready.' },
                assistant: {
                  text: 'Great, one more detail.',
                  audioUrl: 'https://cdn.example.com/turn-h1.mp3',
                  audioMimeType: 'audio/mpeg',
                  audioExpiresAt: '2026-03-11T10:05:00.000Z',
                  ttsAvailable: true,
                },
                safety: {
                  flagged: false,
                  reason: 'none',
                  safeResponse: null,
                },
              },
            }),
        });

      const start = await api.startVoiceSession({
        flow: 'onboarding',
        clientSessionId: '12121212-1212-4212-8212-121212121212',
      });
      expect(start.assistant.audioUrl).toBe('https://cdn.example.com/handshake.mp3');
      expect(start.assistant.ttsAvailable).toBe(true);

      const turn = await api.submitVoiceTurn({
        sessionId: start.session.id,
        clientTurnId: '34343434-3434-4343-8343-343434343434',
        audioUri: 'file:///tmp/turn-h1.m4a',
        audioMimeType: 'audio/x-m4a',
      });
      expect(turn.turn.assistant?.text).toBe('Great, one more detail.');
      expect(turn.session.readyToEnd).toBe(false);
    });

    it('should send reflectionTrack=core on start and support staged->finalize for core track', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_core_1',
                flow: 'first_reflection',
                state: 'active',
                dateLocal: '2026-03-11',
                readyToEnd: false,
                nextTurnIndex: 1,
              },
              assistant: {
                text: 'Core reflection intro.',
                audioUrl: 'https://cdn.example.com/core-intro.mp3',
                audioMimeType: 'audio/mpeg',
                audioExpiresAt: '2026-03-11T10:00:00.000Z',
                ttsAvailable: true,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_core_1',
                state: 'active',
                readyToEnd: false,
                nextTurnIndex: 2,
              },
              turn: {
                id: 'vturn_core_1',
                index: 1,
                clientTurnId: '45454545-4545-4454-8454-454545454545',
                userTranscript: { text: 'Core staged transcript' },
                assistantPending: true,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_core_1',
                state: 'active',
                readyToEnd: true,
                nextTurnIndex: 3,
              },
              turn: {
                id: 'vturn_core_1',
                index: 1,
                clientTurnId: '45454545-4545-4454-8454-454545454545',
                userTranscript: { text: 'Core staged transcript' },
                assistant: {
                  text: 'Core finalized reply.',
                  audioUrl: 'https://cdn.example.com/core-final.mp3',
                  audioMimeType: 'audio/mpeg',
                  audioExpiresAt: '2026-03-11T10:05:00.000Z',
                  ttsAvailable: true,
                },
                safety: {
                  flagged: false,
                  reason: 'none',
                  safeResponse: null,
                },
              },
            }),
        });

      const start = await api.startVoiceSession({
        flow: 'first_reflection',
        reflectionTrack: 'core',
        clientSessionId: '13131313-1313-4131-8131-131313131313',
        dateLocal: '2026-03-11',
      });
      expect(start.session.id).toBe('vsn_core_1');

      const startBody = JSON.parse(
        mockFetch.mock.calls[0][1].body as string,
      ) as Record<string, unknown>;
      expect(startBody.flow).toBe('first_reflection');
      expect(startBody.reflectionTrack).toBe('core');

      const clientTurnId = '45454545-4545-4454-8454-454545454545';
      const staged = await api.submitVoiceTurn({
        sessionId: start.session.id,
        clientTurnId,
        responseMode: 'staged',
        audioUri: 'file:///tmp/core-staged.m4a',
        audioMimeType: 'audio/x-m4a',
      });
      expect(staged.turn.assistantPending).toBe(true);
      expect(staged.turn.userTranscript.text).toBe('Core staged transcript');

      const finalized = await api.submitVoiceTurn({
        sessionId: start.session.id,
        clientTurnId,
        responseMode: 'finalize',
      });
      expect(finalized.turn.assistant?.text).toBe('Core finalized reply.');

      const stagedBody = mockFetch.mock.calls[1][1].body as FormData;
      expect(stagedBody.get('responseMode')).toBe('staged');
      expect(stagedBody.get('clientTurnId')).toBe(clientTurnId);
      expect(stagedBody.get('audio')).toBeTruthy();

      const finalizeBody = mockFetch.mock.calls[2][1].body as FormData;
      expect(finalizeBody.get('responseMode')).toBe('finalize');
      expect(finalizeBody.get('clientTurnId')).toBe(clientTurnId);
      expect(finalizeBody.get('audio')).toBeNull();
    });

    it('should support staged turn response with assistantPending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            session: {
              id: 'vsn_stage_1',
              state: 'active',
              readyToEnd: false,
              nextTurnIndex: 3,
            },
            turn: {
              id: 'vturn_stage_1',
              index: 2,
              clientTurnId: '99999999-9999-4999-8999-999999999999',
              userTranscript: { text: 'staged transcript' },
              assistantPending: true,
            },
          }),
      });

      const result = await api.submitVoiceTurn({
        sessionId: 'vsn_stage_1',
        clientTurnId: '99999999-9999-4999-8999-999999999999',
        responseMode: 'staged',
        audioUri: 'file:///tmp/staged.m4a',
        audioMimeType: 'audio/x-m4a',
      });

      expect(result.turn.assistantPending).toBe(true);
      expect(result.turn.assistant).toBeUndefined();
      const body = mockFetch.mock.calls[0][1].body as FormData;
      expect(body.get('responseMode')).toBe('staged');
      expect(body.get('audio')).toBeTruthy();
    });

    it('should send finalize mode without audio file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            session: {
              id: 'vsn_stage_1',
              state: 'active',
              readyToEnd: true,
              nextTurnIndex: 4,
            },
            turn: {
              id: 'vturn_stage_1',
              index: 2,
              clientTurnId: 'abababab-abab-4bab-8bab-abababababab',
              userTranscript: { text: 'staged transcript' },
              assistant: {
                text: 'finalized reply',
                audioUrl: 'https://cdn.example.com/finalized.mp3',
                audioMimeType: 'audio/mpeg',
                audioExpiresAt: '2026-03-11T10:15:00.000Z',
                ttsAvailable: true,
              },
              safety: {
                flagged: false,
                reason: 'none',
                safeResponse: null,
              },
            },
          }),
      });

      const result = await api.submitVoiceTurn({
        sessionId: 'vsn_stage_1',
        clientTurnId: 'abababab-abab-4bab-8bab-abababababab',
        responseMode: 'finalize',
      });

      expect(result.turn.assistant?.text).toBe('finalized reply');
      const body = mockFetch.mock.calls[0][1].body as FormData;
      expect(body.get('responseMode')).toBe('finalize');
      expect(body.get('audio')).toBeNull();
    });

    it('should retry /end once with forced token refresh after HTML 404', async () => {
      const getToken = jest
        .fn()
        .mockResolvedValueOnce('stale-token')
        .mockResolvedValueOnce('fresh-token');
      setTokenGetter(getToken);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type' ? 'text/html' : null,
          },
          text: async () => '<!DOCTYPE html><html><body>Not found</body></html>',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: () => 'application/json',
          },
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_server_123',
                flow: 'onboarding',
                state: 'ended',
              },
              result: {
                reflection: null,
                onboarding: {
                  completed: true,
                  user: {
                    id: 'u_1',
                  },
                },
              },
            }),
        });

      const result = await api.endVoiceSession({
        sessionId: 'vsn_server_123',
        clientEndId: '44444444-4444-4444-8444-444444444444',
        reason: 'user_cancelled',
        commit: false,
      });

      expect(result.session.state).toBe('ended');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(getToken).toHaveBeenCalledTimes(2);
      expect(getToken.mock.calls[1][0]).toMatchObject({
        forceRefresh: true,
      });
    });

    it('should not globally backoff after /end HTML auth-routing failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type' ? 'text/html' : null,
          },
          text: async () => '<!DOCTYPE html><html><body>Not found</body></html>',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type' ? 'text/html' : null,
          },
          text: async () => '<!DOCTYPE html><html><body>Not found</body></html>',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              session: {
                id: 'vsn_new_1',
                flow: 'onboarding',
                state: 'active',
                dateLocal: null,
                readyToEnd: false,
              },
              assistant: {
                text: 'hello',
                audioUrl: null,
                audioMimeType: null,
                audioExpiresAt: null,
                ttsAvailable: false,
              },
            }),
        });

      await expect(
        api.endVoiceSession({
          sessionId: 'vsn_server_404',
          clientEndId: '55555555-5555-4555-8555-555555555555',
          reason: 'user_cancelled',
          commit: false,
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ROUTING_FAILURE',
      });

      await expect(
        api.startVoiceSession({
          flow: 'onboarding',
          clientSessionId: '66666666-6666-4666-8666-666666666666',
        })
      ).resolves.toMatchObject({
        session: {
          id: 'vsn_new_1',
        },
      });
    });

    it('should surface onboarding_incomplete code from /end 422 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: {
          get: () => 'application/json',
        },
        text: async () =>
          JSON.stringify({
            error: {
              code: 'onboarding_incomplete',
              message: 'Missing required onboarding slots',
              retryable: false,
            },
          }),
      });

      await expect(
        api.endVoiceSession({
          sessionId: 'vsn_server_422',
          clientEndId: '77777777-7777-4777-8777-777777777777',
          reason: 'user_completed',
          commit: true,
        }),
      ).rejects.toMatchObject({
        status: 422,
        code: 'onboarding_incomplete',
      });
    });
  });
});
