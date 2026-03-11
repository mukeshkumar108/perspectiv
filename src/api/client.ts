import { z } from "zod";
import { createLogger } from "../lib/logger";
import {
  MeResponseSchema,
  MomentsListResponseSchema,
  MoodRequestSchema,
  MoodResponseSchema,
  MomentRequestSchema,
  MomentResponseSchema,
  ReflectionRequestSchema,
  ReflectionResponseSchema,
  StreaksResponseSchema,
  TodayResponseSchema,
  VoiceEndRequestSchema,
  VoiceEndResponseSchema,
  VoiceStartRequestSchema,
  VoiceStartResponseSchema,
  VoiceTurnRequestSchema,
  VoiceTurnResponseSchema,
  type MeResponse,
  type MomentsListResponse,
  type MoodRequest,
  type MoodResponse,
  type MomentRequest,
  type MomentResponse,
  type ReflectionRequest,
  type ReflectionResponse,
  type StreaksResponse,
  type TodayResponse,
  type VoiceEndRequest,
  type VoiceEndResponse,
  type VoiceStartRequest,
  type VoiceStartResponse,
  type VoiceTurnRequest,
  type VoiceTurnResponse,
} from "./schemas";

const RAW_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://b-attic.vercel.app";
const NORMALIZED_BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");
export const API_BASE_URL = NORMALIZED_BASE_URL;
const apiLogger = createLogger("api");
let didLogBaseUrl = false;
const routingBackoffByPath = new Map<string, number>();
const ROUTING_BACKOFF_MS = 10_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type TokenGetOptions = {
  forceRefresh?: boolean;
  reason?: string;
};

export type TokenGetter = (options?: TokenGetOptions) => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;
let tokenClearer: (() => void) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export function setTokenClearer(clearer: () => void) {
  tokenClearer = clearer;
}

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  schema?: z.ZodSchema<T>,
): Promise<T> {
  const normalizedEndpoint = endpoint.trim().replace(/^\/+/, "");
  const fullPath = `/${normalizedEndpoint}`;

  if (!didLogBaseUrl) {
    didLogBaseUrl = true;
    apiLogger.info("baseUrl", {
      baseUrl: API_BASE_URL,
      fullUrl: `${API_BASE_URL}${fullPath}`,
    });
  }

  const routingBackoffUntil = routingBackoffByPath.get(fullPath) ?? 0;
  if (Date.now() < routingBackoffUntil) {
    throw new ApiError(503, "Routing backoff active", "ROUTING_BACKOFF");
  }

  const method = options.method ?? "GET";
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const fullUrl = `${API_BASE_URL}${fullPath}`;

  const parseTokenExp = (token: string | null) => {
    if (!token) return { tokenExpEpochSec: null, tokenTtlSec: null };
    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        return { tokenExpEpochSec: null, tokenTtlSec: null };
      }
      const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payloadPart.padEnd(
        payloadPart.length + ((4 - (payloadPart.length % 4)) % 4),
        "=",
      );
      const decoded =
        typeof atob === "function"
          ? atob(padded)
          : typeof Buffer !== "undefined"
            ? Buffer.from(padded, "base64").toString("utf8")
            : null;
      if (!decoded) return { tokenExpEpochSec: null, tokenTtlSec: null };
      const payload = JSON.parse(decoded) as { exp?: number };
      const exp = typeof payload.exp === "number" ? payload.exp : null;
      if (!exp) return { tokenExpEpochSec: null, tokenTtlSec: null };
      return {
        tokenExpEpochSec: exp,
        tokenTtlSec: exp - Math.floor(Date.now() / 1000),
      };
    } catch {
      return { tokenExpEpochSec: null, tokenTtlSec: null };
    }
  };

  const executeAttempt = async (forceRefreshToken: boolean) => {
    const token = await tokenGetter?.({
      forceRefresh: forceRefreshToken,
      reason: `${method} ${fullPath}`,
    });

    const headers: HeadersInit = {
      ...options.headers,
    };

    const hasContentType = Boolean(
      (headers as Record<string, string>)["Content-Type"],
    );
    const isFormDataBody =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    if (!hasContentType && !isFormDataBody) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const hasAuthHeader = Boolean(
      (headers as Record<string, string>)["Authorization"],
    );
    const tokenExp = parseTokenExp(token ?? null);
    apiLogger.info("request", {
      requestId,
      method,
      path: fullPath,
      fullUrl,
      hasAuthHeader,
      tokenLength: token ? token.length : 0,
      tokenExpEpochSec: tokenExp.tokenExpEpochSec,
      tokenTtlSec: tokenExp.tokenTtlSec,
      forcedRefresh: forceRefreshToken,
    });

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(fullUrl, {
        ...options,
        headers,
      });
    } catch {
      const elapsedMs = Date.now() - startedAt;
      apiLogger.warn("response", {
        requestId,
        status: 0,
        ok: false,
        elapsedMs,
        bodyPreview: "",
        error: {
          status: 0,
          message: "Network error",
          code: "FETCH_FAILED",
        },
      });
      throw new ApiError(0, "Network error", "FETCH_FAILED");
    }

    const elapsedMs = Date.now() - startedAt;
    const responseText = await response.text();
    const trimmedBody = responseText.trimStart();
    const isHtmlResponse =
      trimmedBody.startsWith("<!DOCTYPE") || trimmedBody.startsWith("<html");
    let parsedBody: unknown = null;
    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        parsedBody = responseText;
      }
    }
    const contentType = response.headers?.get?.("content-type") ?? null;
    const clerkAuthStatus =
      response.headers?.get?.("x-clerk-auth-status") ?? null;
    const clerkAuthReason =
      response.headers?.get?.("x-clerk-auth-reason") ?? null;
    return {
      response,
      elapsedMs,
      parsedBody,
      bodyPreview: responseText.slice(0, 200),
      isHtmlResponse,
      contentType,
      clerkAuthStatus,
      clerkAuthReason,
      forcedRefreshToken: forceRefreshToken,
    };
  };

  let attempt = await executeAttempt(false);
  const shouldRetryWithFreshToken =
    attempt.isHtmlResponse &&
    [401, 403, 404].includes(attempt.response.status);
  if (shouldRetryWithFreshToken) {
    tokenClearer?.();
    apiLogger.warn("authRetry", {
      requestId,
      method,
      path: fullPath,
      status: attempt.response.status,
      contentType: attempt.contentType,
    });
    attempt = await executeAttempt(true);
  }

  if (!attempt.response.ok || attempt.isHtmlResponse) {
    let errorMessage = `Request failed with status ${attempt.response.status}`;
    let errorCode: string | undefined;

    try {
      if (attempt.isHtmlResponse) {
        const isAuthRoutingFailure = [401, 403, 404].includes(
          attempt.response.status,
        );
        if (isAuthRoutingFailure) {
          errorMessage = "Auth/routing failure from API";
          errorCode = "AUTH_ROUTING_FAILURE";
        } else {
          errorMessage = "HTML response from API (routing error)";
          errorCode = "HTML_RESPONSE";
          routingBackoffByPath.set(fullPath, Date.now() + ROUTING_BACKOFF_MS);
        }
      } else if (attempt.parsedBody && typeof attempt.parsedBody === "object") {
        const errorRecord = attempt.parsedBody as Record<string, unknown>;
        const nestedError =
          errorRecord.error && typeof errorRecord.error === "object"
            ? (errorRecord.error as Record<string, unknown>)
            : null;
        const nestedMessage =
          nestedError && typeof nestedError.message === "string"
            ? nestedError.message
            : null;
        const nestedCode =
          nestedError && typeof nestedError.code === "string"
            ? nestedError.code
            : undefined;
        const topLevelMessage =
          typeof errorRecord.message === "string"
            ? errorRecord.message
            : typeof errorRecord.error === "string"
              ? errorRecord.error
              : null;
        const topLevelCode =
          typeof errorRecord.code === "string" ? errorRecord.code : undefined;
        errorMessage = nestedMessage || topLevelMessage || errorMessage;
        errorCode = nestedCode || topLevelCode;
      }
    } catch {
      // Ignore JSON parse errors
    }

    apiLogger.warn("response", {
      requestId,
      status: attempt.response.status,
      ok: attempt.response.ok,
      elapsedMs: attempt.elapsedMs,
      bodyPreview: attempt.bodyPreview,
      errorBody:
        fullPath === "/api/bluum/voice/session/end"
          ? attempt.parsedBody
          : undefined,
      contentType: attempt.contentType,
      clerkAuthStatus: attempt.clerkAuthStatus,
      clerkAuthReason: attempt.clerkAuthReason,
      error: {
        status: attempt.response.status,
        message: errorMessage,
        code: errorCode,
      },
    });

    if (attempt.response.status === 401) {
      tokenClearer?.();
      onUnauthorized?.();
    }

    throw new ApiError(
      attempt.response.status,
      errorMessage,
      errorCode,
      attempt.parsedBody,
    );
  }

  routingBackoffByPath.delete(fullPath);
  apiLogger.info("response", {
    requestId,
    status: attempt.response.status,
    ok: attempt.response.ok,
    elapsedMs: attempt.elapsedMs,
    bodyPreview: attempt.bodyPreview,
  });

  const data = attempt.parsedBody;

  if (schema) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.warn("API response validation warning:", result.error);
      // Return data anyway to be resilient to minor schema changes
      return data as T;
    }
    return result.data;
  }

  return data as T;
}

export const api = {
  /**
   * Get today's prompt
   */
  getToday(): Promise<TodayResponse> {
    return request("/api/bluum/today", { method: "GET" }, TodayResponseSchema);
  },

  /**
   * Submit a reflection
   */
  submitReflection(data: ReflectionRequest): Promise<ReflectionResponse> {
    ReflectionRequestSchema.parse(data); // Validate input
    const payload: RequestInit = {
      method: "POST",
      body: JSON.stringify(data),
    };

    const primary = () =>
      request("/api/bluum/reflection", payload, ReflectionResponseSchema);

    // Some deployed API versions may still use alternate reflection routes.
    // Retry on routing-style failures to avoid breaking submission flow.
    return primary().catch((error) => {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      const shouldFallback =
        error.status === 404 ||
        error.code === "HTML_RESPONSE" ||
        error.code === "ROUTING_BACKOFF";
      if (!shouldFallback) {
        throw error;
      }

      return request("/api/bluum/reflect", payload, ReflectionResponseSchema).catch(
        (fallbackError) => {
          if (
            fallbackError instanceof ApiError &&
            (fallbackError.status === 404 || fallbackError.code === "HTML_RESPONSE")
          ) {
            return request(
              "/api/bluum/reflections",
              payload,
              ReflectionResponseSchema,
            );
          }
          throw fallbackError;
        },
      );
    });
  },

  /**
   * Get user streaks
   */
  getStreaks(): Promise<StreaksResponse> {
    return request(
      "/api/bluum/streaks",
      { method: "GET" },
      StreaksResponseSchema,
    );
  },

  /**
   * Get user profile
   */
  getMe(): Promise<MeResponse> {
    return request("/api/bluum/me", { method: "GET" }, MeResponseSchema);
  },

  /**
   * Submit mood
   */
  submitMood(data: MoodRequest): Promise<MoodResponse> {
    MoodRequestSchema.parse(data);
    return request(
      "/api/bluum/mood",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      MoodResponseSchema,
    );
  },

  /**
   * Capture a moment
   */
  captureMoment(data: MomentRequest): Promise<MomentResponse> {
    MomentRequestSchema.parse(data);
    return request(
      "/api/bluum/moment",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      MomentResponseSchema,
    );
  },

  /**
   * Get moments list
   */
  getMoments(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<MomentsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    const query = searchParams.toString();
    const endpoint = `/api/bluum/moments${query ? `?${query}` : ""}`;
    return request(endpoint, { method: "GET" }, MomentsListResponseSchema);
  },

  /**
   * Start voice session
   */
  startVoiceSession(data: VoiceStartRequest): Promise<VoiceStartResponse> {
    VoiceStartRequestSchema.parse(data);
    return request(
      "/api/bluum/voice/session/start",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      VoiceStartResponseSchema,
    );
  },

  /**
   * Submit one recorded voice turn
   */
  submitVoiceTurn(data: VoiceTurnRequest): Promise<VoiceTurnResponse> {
    VoiceTurnRequestSchema.parse(data);
    const form = new FormData();
    form.append("sessionId", data.sessionId);
    form.append("clientTurnId", data.clientTurnId);
    form.append("audio", {
      uri: data.audioUri,
      name: "voice-turn.m4a",
      type: data.audioMimeType,
    } as any);
    if (typeof data.audioDurationMs === "number") {
      form.append("audioDurationMs", String(Math.round(data.audioDurationMs)));
    }
    if (data.locale) form.append("locale", data.locale);
    if (data.deviceTs) form.append("deviceTs", data.deviceTs);

    return request(
      "/api/bluum/voice/session/turn",
      {
        method: "POST",
        body: form,
      },
      VoiceTurnResponseSchema,
    );
  },

  /**
   * End and optionally commit a voice session
   */
  endVoiceSession(data: VoiceEndRequest): Promise<VoiceEndResponse> {
    VoiceEndRequestSchema.parse(data);
    return request(
      "/api/bluum/voice/session/end",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      VoiceEndResponseSchema,
    );
  },
};
