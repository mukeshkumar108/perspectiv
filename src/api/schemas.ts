import { z } from 'zod';

// Today's prompt response
export const TodayResponseSchema = z.object({
  prompt: z.object({
    id: z.string(),
    text: z.string(),
    createdAt: z.string().optional(),
  }),
  hasReflectedToday: z.boolean(),
});

export type TodayResponse = z.infer<typeof TodayResponseSchema>;

// Reflection submission
export const ReflectionRequestSchema = z.object({
  responseText: z.string().min(1),
});

export type ReflectionRequest = z.infer<typeof ReflectionRequestSchema>;

export const ReflectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  safetyFlagged: z.boolean().optional(),
  reflection: z.object({
    id: z.string(),
    responseText: z.string(),
    createdAt: z.string(),
  }).optional(),
});

export type ReflectionResponse = z.infer<typeof ReflectionResponseSchema>;

// Streaks
export const StreaksResponseSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  totalReflections: z.number(),
  lastReflectionDate: z.string().nullable().optional(),
});

export type StreaksResponse = z.infer<typeof StreaksResponseSchema>;

// User profile (optional endpoint)
export const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
