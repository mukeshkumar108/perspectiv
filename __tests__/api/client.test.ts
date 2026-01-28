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
});
