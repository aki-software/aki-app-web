export interface DashboardStatsResponse {
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
  channelBreakdown: DashboardChannelBreakdown;
  sessionsActivity: SessionActivityData[];
  resultsDistribution: CategoryDistributionData[];
  alerts: AdminAlert[];
  activity: AdminActivityEvent[];
}

export interface DashboardChannelBreakdown {
  voucher: DashboardChannelMetrics;
  individual: DashboardChannelMetrics;
}

export interface DashboardChannelMetrics {
  started: number;
  completed: number;
  reportsUnlocked: number;
}

export interface SessionActivityData {
  date: string;
  count: number;
}

export interface CategoryDistributionData {
  categoryId: string;
  name?: string;
  count: number;
}

export type AdminAlertSeverity = 'critical' | 'warning' | 'info';

export interface AdminAlert {
  id: string;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
}

export type AdminActivityEventType =
  | 'SESSION_COMPLETED'
  | 'SESSION_STARTED'
  | 'VOUCHER_REDEEMED'
  | 'VOUCHER_ISSUED';

export interface AdminActivityEvent {
  id: string;
  type: AdminActivityEventType;
  title: string;
  description: string;
  occurredAt: string;
}

export type AdminActivityItem = AdminActivityEvent;

export type RawCountRow = { count: string };
export type RawTotalsRow = { totalSessions: string; totalTimeMs: string };
export type RawCompletedSessionsRow = { completedSessions: string };
export type RawSessionsActivityRow = { day: string; count: string };
export type RawTopCategoryRow = { categoryId: string; count: string };

export type RawRecentSessionRow = {
  id: string;
  patientName: string;
  createdAt: string;
  sessionDate: string;
  hollandCode: string;
  paymentStatus: string;
  voucherCode: string | null;
  voucherId: string | null;
  reportUnlockedAt: string | null;
  paidAt: string | null;
  resultsCount: string;
};

export interface DashboardStatsPayload extends DashboardStatsResponse {
  activity: AdminActivityEvent[];
}
