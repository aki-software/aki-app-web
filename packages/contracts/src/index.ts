export interface DashboardStatsResponse {
  totalSessions: number;
  completionRate: number; // Percentage
  averageTimeSeconds: number;
  sessionsActivity: SessionActivityData[];
  resultsDistribution: CategoryDistributionData[];
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
