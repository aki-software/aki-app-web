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
  calculatedAt: z.union([z.string(), z.instanceof(Date)]),
});

export interface SessionMetrics extends z.infer<typeof sessionMetricsSchema> {}

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
