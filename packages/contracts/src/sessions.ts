export const SessionPaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  VOUCHER_REDEEMED: 'VOUCHER_REDEEMED',
} as const;

export type SessionPaymentStatus = (typeof SessionPaymentStatus)[keyof typeof SessionPaymentStatus];

export interface SessionResultData {
  categoryId: string;
  percentage: number;
}

export interface SessionSwipeData {
  cardId: string;
  categoryId: string;
  isLiked: boolean;
  timestamp?: string | Date;
}

export interface SessionMetrics {
  id: number;
  totalDurationMs: number;
  totalSwipes: number;
  uniqueCards: number;
  revertedMatches: number;
  avgTimeBetweenSwipesMs: number;
  minTimeBetweenSwipesMs: number;
  maxTimeBetweenSwipesMs: number;
  reliabilityScore: number;
  reliabilityLevel: 'Muy Alta' | 'Alta' | 'Variable' | 'Baja';
  calculatedAt: string | Date;
}

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
export type SessionApi = any;
export type SessionResultApi = SessionResultData;
