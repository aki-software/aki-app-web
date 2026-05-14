export type VoucherStats = {
  totalBatches: number;
  totalVouchers: number;
  availableVouchers: number;
  usedVouchers: number;
  sentVouchers: number;
  expiredVouchers: number;
  revokedVouchers: number;
  redemptionRate: number;
};

export type VoucherAlert = {
  institutionId: string;
  institutionName: string;
  availableCount: number;
  message: string;
  severity: 'warning' | 'critical';
};

export type VoucherStatsResponse = {
  stats: VoucherStats;
  alerts: VoucherAlert[];
};
