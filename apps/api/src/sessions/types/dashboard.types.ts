import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';

export type DashboardStatsPayload = {
  totalSessions: number;
  totalHistoricalVouchers: number;
  completionRate: number;
  averageTimeSeconds: number;
  availableVouchers: number;
  redeemedVouchers: number;
  periodDays: number;
  periodLabel: string;
  vouchersGeneratedPeriod: number;
  vouchersRedeemedPeriod: number;
  testsStartedPeriod: number;
  testsCompletedPeriod: number;
  voucherRedemptionRatePeriod: number;
  reportsUnlockedPeriod: number;
  channelBreakdown: {
    voucher: {
      started: number;
      completed: number;
      reportsUnlocked: number;
    };
    individual: {
      started: number;
      completed: number;
      reportsUnlocked: number;
    };
  };
  sessionsActivity: Array<{ date: string; count: number }>;
  resultsDistribution: Array<{
    categoryId: string;
    name?: string;
    count: number;
  }>;
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    actionLabel: string;
    actionPath: string;
  }>;
  activity: Array<{
    id: string;
    type:
      | 'SESSION_COMPLETED'
      | 'SESSION_STARTED'
      | 'VOUCHER_REDEEMED'
      | 'VOUCHER_ISSUED';
    title: string;
    description: string;
    occurredAt: string;
  }>;
};

export type AdminActivityItem = DashboardStatsPayload['activity'][number];

export type RawCountRow = { count: string };
export type RawTotalsRow = { totalSessions: string; totalTimeMs: string };
export type RawCompletedSessionsRow = { completedSessions: string };
export type RawSessionsActivityRow = { day: string; count: string };
export type RawTopCategoryRow = { categoryId: string; count: string };

export type RawRecentSessionRow = {
  id: string;
  patientName: string | null;
  createdAt: Date | string;
  sessionDate: Date | string | null;
  reportUnlockedAt: Date | string | null;
  paidAt: Date | string | null;
  voucherId: string | null;
  paymentStatus: SessionPaymentStatus | null;
  resultsCount: string;
};

export type RawRecentVoucherRow = {
  id: string;
  code: string;
  status: VoucherStatus;
  createdAt: Date | string;
  sentAt: Date | string | null;
  redeemedAt: Date | string | null;
  ownerInstitutionName: string | null;
  ownerUserName: string | null;
};
