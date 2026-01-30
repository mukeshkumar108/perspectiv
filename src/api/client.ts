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
} from "./schemas";

const RAW_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://b-attic.vercel.app";
const NORMALIZED_BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");
export const API_BASE_URL = NORMALIZED_BASE_URL;
const apiLogger = createLogger("api");
let didLogBaseUrl = false;
let routingBackoffUntil = 0;
const ROUTING_BACKOFF_MS = 10_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type TokenGetter = () => Promise<string | null>;

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
  const token = await tokenGetter?.();
  const normalizedEndpoint = endpoint.trim().replace(/^\/+/, "");
  const fullPath = `/${normalizedEndpoint}`;

  if (!didLogBaseUrl) {
    didLogBaseUrl = true;
    apiLogger.info("baseUrl", {
      baseUrl: API_BASE_URL,
      fullUrl: `${API_BASE_URL}${fullPath}`,
    });
  }

  if (Date.now() < routingBackoffUntil) {
    throw new ApiError(503, "Routing backoff active", "ROUTING_BACKOFF");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const method = options.method ?? "GET";
  const fullUrl = `${API_BASE_URL}${fullPath}`;
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const hasAuthHeader = Boolean(
    (headers as Record<string, string>)["Authorization"],
  );
  apiLogger.info("request", {
    requestId,
    method,
    path: fullPath,
    fullUrl,
    hasAuthHeader,
    tokenLength: token ? token.length : 0,
  });

  const startedAt = Date.now();
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

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

  const bodyPreview = responseText.slice(0, 200);

  if (!response.ok || isHtmlResponse) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      if (isHtmlResponse) {
        errorMessage = "HTML response from API (routing error)";
        errorCode = "HTML_RESPONSE";
        routingBackoffUntil = Date.now() + ROUTING_BACKOFF_MS;
      } else if (parsedBody && typeof parsedBody === "object") {
        const errorRecord = parsedBody as Record<string, string>;
        errorMessage = errorRecord.message || errorRecord.error || errorMessage;
        errorCode = errorRecord.code;
      }
    } catch {
      // Ignore JSON parse errors
    }

    apiLogger.warn("response", {
      requestId,
      status: response.status,
      ok: response.ok,
      elapsedMs,
      bodyPreview,
      error: {
        status: response.status,
        message: errorMessage,
        code: errorCode,
      },
    });

    if (response.status === 401) {
      tokenClearer?.();
      onUnauthorized?.();
    }

    throw new ApiError(response.status, errorMessage, errorCode);
  }

  apiLogger.info("response", {
    requestId,
    status: response.status,
    ok: response.ok,
    elapsedMs,
    bodyPreview,
  });

  const data = parsedBody;

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
    return request(
      "/api/bluum/reflection",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      ReflectionResponseSchema,
    );
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
};
