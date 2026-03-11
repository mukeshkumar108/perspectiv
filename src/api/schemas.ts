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

// Voice session
export const VoiceFlowSchema = z.enum(['onboarding', 'first_reflection']);
export type VoiceFlow = z.infer<typeof VoiceFlowSchema>;

export const VoiceSessionStateSchema = z.enum([
  'active',
  'ended',
  'expired',
  'aborted',
  'inactive',
]);

export const VoiceAssistantSchema = z.object({
  text: z.string(),
  audioUrl: z.string().nullable(),
  audioMimeType: z.string().nullable(),
  audioExpiresAt: z.string().nullable(),
  ttsAvailable: z.boolean(),
});

export const VoiceSessionEnvelopeSchema = z.object({
  id: z.string(),
  flow: VoiceFlowSchema.optional(),
  state: VoiceSessionStateSchema,
  dateLocal: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  nextTurnIndex: z.number().optional(),
  readyToEnd: z.boolean().optional(),
  safetyFlagged: z.boolean().optional(),
});

export const VoiceStartRequestSchema = z.object({
  flow: VoiceFlowSchema,
  clientSessionId: z.string().min(8),
  dateLocal: z.string().optional(),
  locale: z.string().optional(),
  ttsVoiceId: z.string().optional(),
});

export type VoiceStartRequest = z.infer<typeof VoiceStartRequestSchema>;

export const VoiceStartResponseSchema = z.object({
  session: VoiceSessionEnvelopeSchema,
  assistant: VoiceAssistantSchema,
});

export type VoiceStartResponse = z.infer<typeof VoiceStartResponseSchema>;

export const VoiceTurnRequestSchema = z.object({
  sessionId: z.string(),
  clientTurnId: z.string().min(8),
  responseMode: z.enum(['final', 'staged', 'finalize']).optional(),
  audioUri: z.string().min(1).optional(),
  audioMimeType: z.string().min(1).optional(),
  audioDurationMs: z.number().positive().optional(),
  locale: z.string().optional(),
  deviceTs: z.string().optional(),
}).superRefine((data, ctx) => {
  const mode = data.responseMode ?? 'final';
  if (mode === 'finalize') {
    if (data.audioUri || data.audioMimeType || data.audioDurationMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Finalize mode must not include audio',
        path: ['audioUri'],
      });
    }
    return;
  }
  if (!data.audioUri) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'audioUri is required for final/staged mode',
      path: ['audioUri'],
    });
  }
  if (!data.audioMimeType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'audioMimeType is required for final/staged mode',
      path: ['audioMimeType'],
    });
  }
});

export type VoiceTurnRequest = z.infer<typeof VoiceTurnRequestSchema>;

export const VoiceSafeResourceSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const VoiceSafeResponseSchema = z.object({
  message: z.string(),
  resources: z.array(VoiceSafeResourceSchema),
});

export const VoiceTurnResponseSchema = z.object({
  session: VoiceSessionEnvelopeSchema,
  turn: z.object({
    id: z.string(),
    index: z.number(),
    clientTurnId: z.string(),
    userTranscript: z.object({
      text: z.string(),
    }),
    assistantPending: z.boolean().optional(),
    assistant: VoiceAssistantSchema.optional(),
    safety: z.object({
      flagged: z.boolean(),
      reason: z.string().nullable().optional(),
      safeResponse: VoiceSafeResponseSchema.nullable(),
    }).optional(),
  }),
});

export type VoiceTurnResponse = z.infer<typeof VoiceTurnResponseSchema>;

export const VoiceEndRequestSchema = z.object({
  sessionId: z.string(),
  clientEndId: z.string().min(8),
  reason: z
    .enum(['user_completed', 'user_cancelled', 'timeout', 'safety_stop'])
    .optional(),
  commit: z.boolean().optional(),
});

export type VoiceEndRequest = z.infer<typeof VoiceEndRequestSchema>;

export const VoiceEndResponseSchema = z.object({
  session: VoiceSessionEnvelopeSchema,
  result: z.object({
    reflection: z
      .object({
        saved: z.boolean().optional(),
        safetyFlagged: z.boolean().optional(),
        successMessage: z.string().nullable().optional(),
        coach: z
          .object({
            type: z.string(),
            text: z.string(),
          })
          .nullable()
          .optional(),
        safeResponse: VoiceSafeResponseSchema.optional(),
      })
      .nullable(),
    onboarding: z
      .object({
        completed: z.boolean(),
        user: z.object({
          id: z.string(),
          displayName: z.string().nullable().optional(),
          timezone: z.string().nullable().optional(),
          onboardingCompleted: z.boolean().optional(),
          reflectionReminderEnabled: z.boolean().optional(),
          reflectionReminderTimeLocal: z.string().nullable().optional(),
        }),
      })
      .nullable(),
  }),
});

export type VoiceEndResponse = z.infer<typeof VoiceEndResponseSchema>;
