export type AdminDashboardVoucherTotalsRow = {
  available: string;
  redeemed: string;
  historical: string;
};

export type AdminDashboardPeriodVoucherStatsRow = {
  issued: string;
  redeemed: string;
};

export type AdminDashboardSessionTotalsRow = {
  totalSessions: string;
  totalTimeMs: string;
  completedSessions: string;
};

export type AdminDashboardPeriodSessionStatsRow = {
  started: string;
  completed: string;
  reportsUnlocked: string;
  voucherStarted: string;
  voucherCompleted: string;
  voucherReportsUnlocked: string;
  individualCompleted: string;
};
