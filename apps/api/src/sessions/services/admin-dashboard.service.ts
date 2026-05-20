import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../../categories/categories.service.js';
import { AdminDashboardQueriesService } from './admin-dashboard-queries.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { DashboardStatsPayload, AdminActivityItem } from '@akit/contracts';
import { AdminDashboardStatsService } from './admin-dashboard-stats.service.js';
import { AdminDashboardFormatterService } from './admin-dashboard-formatter.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly queriesService: AdminDashboardQueriesService,
    private readonly vouchersService: VouchersService,
    private readonly statsService: AdminDashboardStatsService,
    private readonly formatter: AdminDashboardFormatterService,
  ) {}

  async getAdminOverview(
    periodDays: number = 7,
  ): Promise<DashboardStatsPayload> {
    const now = new Date();
    const periodStart = this.formatter.getPeriodStart(periodDays, now);

    const [
      voucherTotals,
      periodVoucherStats,
      expiringSoonCount,
      stalledSessionsCount,
      sessionTotals,
      periodSessionStats,
      dailyActivityRows,
      distributionRows,
      categories,
      activity,
    ] = await Promise.all([
      this.statsService.getVoucherTotals(),
      this.statsService.getPeriodVoucherStats(periodStart),
      this.vouchersService.getExpiringSoonCount(),
      this.queriesService.getStalledSessionsCount(),
      this.statsService.getSessionTotals(),
      this.statsService.getPeriodSessionStats(periodStart),
      this.statsService.getDailyActivity(periodStart),
      this.statsService.getTopResultsDistribution(),
      this.categoriesService.findAll(),
      this.getAdminActivity(10),
    ]);

    const resultsDistribution = this.formatter.formatResultsDistribution(
      categories,
      distributionRows,
    );

    return this.formatter.buildOverviewPayload({
      periodDays,
      now,
      periodStart,
      voucherTotals,
      periodVoucherStats,
      expiringSoonCount,
      stalledSessionsCount,
      sessionTotals,
      periodSessionStats,
      dailyActivityRows,
      resultsDistribution,
      activity,
    });
  }

  async getAdminActivity(limit: number = 50): Promise<AdminActivityItem[]> {
    const [sessionRows, voucherActivity] = await Promise.all([
      this.queriesService.getRecentSessionRows(limit),
      this.vouchersService.getRecentActivity(limit),
    ]);

    const sessionActivity = this.formatter.formatSessionActivity(sessionRows);
    return this.formatter.mergeActivity(
      sessionActivity,
      voucherActivity,
      limit,
    );
  }
}
