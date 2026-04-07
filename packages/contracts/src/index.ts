export interface DashboardStatsResponse {
  totalSessions: number;
  completionRate: number; // Percentage
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
  date: string; // ISO String or simply 'Lun', 'Mar'
  count: number;
}

export interface CategoryDistributionData {
  categoryId: string;
  name?: string;
  count: number;
}

export type AdminAlertSeverity = "critical" | "warning" | "info";

export interface AdminAlert {
  id: string;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
}

export type AdminActivityEventType =
  | "SESSION_COMPLETED"
  | "SESSION_STARTED"
  | "VOUCHER_REDEEMED"
  | "VOUCHER_ISSUED";

export interface AdminActivityEvent {
  id: string;
  type: AdminActivityEventType;
  title: string;
  description: string;
  occurredAt: string;
}
