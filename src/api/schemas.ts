import { z } from 'zod';

// Today's prompt response
export const TodayResponseSchema = z.object({
  prompt: z.object({
    id: z.string(),
    text: z.string(),
    createdAt: z.string().optional(),
  }),
  hasReflected: z.boolean().optional(),
  hasReflectedToday: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  hasMood: z.boolean().optional(),
  didSwapPrompt: z.boolean().optional(),
  dateLocal: z.string().optional(),
});

export type TodayResponse = z.infer<typeof TodayResponseSchema>;

// Reflection submission
export const ReflectionRequestSchema = z.object({
  responseText: z.string().min(1),
});

export type ReflectionRequest = z.infer<typeof ReflectionRequestSchema>;

export const ReflectionResponseSchema = z.object({
  success: z.boolean().optional(),
  saved: z.boolean().optional(),
  message: z.string().optional(),
  successMessage: z.string().optional(),
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

// Mood submission
export const MoodRequestSchema = z.object({
  rating: z.number().min(1).max(5),
  dateLocal: z.string().optional(),
  tags: z.array(z.string()).max(5).optional(),
  note: z.string().max(200).optional(),
});

export type MoodRequest = z.infer<typeof MoodRequestSchema>;

export const MoodResponseSchema = z.object({
  saved: z.boolean(),
});

export type MoodResponse = z.infer<typeof MoodResponseSchema>;

// Moment capture
export const MomentRequestSchema = z.object({
  text: z.string().max(280).optional(),
  imageUrl: z.string().optional(),
}).refine((data) => data.text || data.imageUrl, {
  message: "Either text or imageUrl is required",
});

export type MomentRequest = z.infer<typeof MomentRequestSchema>;

export const MomentResponseSchema = z.object({
  saved: z.boolean(),
  id: z.string(),
});

export type MomentResponse = z.infer<typeof MomentResponseSchema>;

// Moments list
export const MomentItemSchema = z.object({
  id: z.string(),
  text: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type MomentItem = z.infer<typeof MomentItemSchema>;

export const MomentsListResponseSchema = z.object({
  items: z.array(MomentItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export type MomentsListResponse = z.infer<typeof MomentsListResponseSchema>;
