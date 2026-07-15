import { z } from 'zod';

export const SessionPaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  VOUCHER_REDEEMED: 'VOUCHER_REDEEMED',
} as const;

export type SessionPaymentStatus = (typeof SessionPaymentStatus)[keyof typeof SessionPaymentStatus];

export const sessionResultDataSchema = z.object({
  categoryId: z.string(),
  percentage: z.number(),
});

export interface SessionResultData extends z.infer<typeof sessionResultDataSchema> {}

export const sessionSwipeDataSchema = z.object({
  cardId: z.string(),
  categoryId: z.string(),
  isLiked: z.boolean(),
  timestamp: z.union([z.string(), z.instanceof(Date)]).optional(),
});

export interface SessionSwipeData extends z.infer<typeof sessionSwipeDataSchema> {}

export const sessionMetricsSchema = z.object({
  id: z.number(),
  totalDurationMs: z.number(),
  totalSwipes: z.number(),
  uniqueCards: z.number(),
  revertedMatches: z.number(),
  avgTimeBetweenSwipesMs: z.number(),
  minTimeBetweenSwipesMs: z.number(),
  maxTimeBetweenSwipesMs: z.number(),
  reliabilityScore: z.number(),
  reliabilityLevel: z.enum(['Muy Alta', 'Alta', 'Variable', 'Baja']),
  // Behavioral metrics
  likeRatio: z.number().nullable(),
  selectivityLevel: z.enum(['SELECTIVE', 'BALANCED', 'EXPLORATORY']).nullable(),
  firstHalfLikeRate: z.number().nullable(),
  lastHalfLikeRate: z.number().nullable(),
  consistencyLevel: z.enum(['CONSISTENT', 'VARIABLE', 'ERRATIC']).nullable(),
  fatigueDetected: z.boolean().nullable(),
  rushDetected: z.boolean().nullable(),
  responseTimeHistogram: z
    .array(z.object({ bucket: z.number(), count: z.number() }))
    .nullable(),
  revertedDirection: z
    .object({
      likedToDisliked: z.number(),
      dislikedToLiked: z.number(),
    })
    .nullable(),
  calculatedAt: z.union([z.string(), z.instanceof(Date)]),
});

export interface SessionMetrics extends z.infer<typeof sessionMetricsSchema> {}

// Triage types
export const triageSessionSchema = z.object({
  sessionId: z.string().uuid(),
  patientName: z.string(),
  sessionDate: z.string(),
  hollandCode: z.string(),
  reliabilityLevel: z.string().nullable(),
  flags: z.array(z.enum(['LOW_RELIABILITY', 'FATIGUE', 'RUSH'])),
  topFlag: z.enum(['LOW_RELIABILITY', 'FATIGUE', 'RUSH']).nullable(),
  likeRatio: z.number().nullable(),
  selectivityLevel: z.string().nullable(),
  totalTimeMs: z.number(),
});

export const triageResponseSchema = z.object({
  data: z.array(triageSessionSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    flaggedCount: z.number(),
  }),
});

export interface TriageSession extends z.infer<typeof triageSessionSchema> {}
export interface TriageResponse extends z.infer<typeof triageResponseSchema> {}

// Behavioral trends types
export const behavioralTrendsSchema = z.object({
  selectivityDistribution: z.object({
    selective: z.number(),
    balanced: z.number(),
    exploratory: z.number(),
  }),
  fatigueRate: z.number().nullable(),
  rushRate: z.number().nullable(),
  avgReliabilityScore: z.number(),
  totalSessions: z.number(),
  eligibleSessions: z.number(),
  trends: z.object({
    daily: z.array(
      z.object({
        date: z.string(),
        sessions: z.number(),
        fatigueRate: z.number(),
        rushRate: z.number(),
      }),
    ),
  }),
});

export interface BehavioralTrends extends z.infer<typeof behavioralTrendsSchema> {}

export const sessionApiSchema = z.object({
  id: z.string().uuid(),
  patientName: z.string(),
  createdAt: z.union([z.string(), z.instanceof(Date), z.number()]).optional(),
  totalTimeMs: z.union([z.string(), z.number()]).optional(),
  paymentStatus: z.string().optional(),
  reportUnlockedAt: z.string().nullable().optional(),
  results: z.array(sessionResultDataSchema).optional(),
  swipes: z.array(sessionSwipeDataSchema).optional(),
  institution: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  therapist: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  voucher: z.object({ code: z.string().nullable().optional() }).nullable().optional(),
});

export type SessionApi = z.infer<typeof sessionApiSchema>;

export interface SessionData {
  id: string;
  patientName: string;
  hollandCode: string;
  sessionDate: string | Date | number;
  totalTimeMs: number;
  paymentStatus: string;
  institutionName: string | null;
  therapistName: string | null;
  voucherCode: string | null;
  reportUnlockedAt?: string | Date | null;
  results?: SessionResultData[];
}

export interface SessionDetailData extends SessionData {
  swipes?: SessionSwipeData[];
  reportUrl?: string | null;
  metrics?: SessionMetrics;
}

export interface SessionScope {
  role?: string;
  email?: string;
  therapistUserId?: string;
  patientId?: string;
  institutionId?: string | null;
}

export interface CreateSessionDto {
  patientName: string;
  sessionDate?: string | Date;
  institutionId?: string;
  therapistUserId?: string;
}

export interface CompleteSessionDto {
  sessionId: string;
  results: SessionResultData[];
  swipes: SessionSwipeData[];
  totalTimeMs: number;
}

// Legacy aliases
export type SessionResultApi = SessionResultData;
