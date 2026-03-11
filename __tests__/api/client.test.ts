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
