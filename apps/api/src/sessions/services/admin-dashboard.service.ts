import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../../categories/categories.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import {
  getPeriodStart,
  buildOverviewPayload,
  formatResultsDistribution,
  formatSessionActivity,
  mergeActivity,
} from '../utils/admin-dashboard-formatter.util.js';
import {
  DashboardStatsPayload,
  AdminActivityItem,
  BehavioralTrends,
} from '@akit/contracts';

const DEFAULT_ACTIVITY_LIMIT = 50;

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly vouchersService: VouchersService,
    private readonly dashboardRepository: AdminDashboardRepository,
  ) {}

  async getAdminOverview(periodDays = 7): Promise<DashboardStatsPayload> {
    const now = new Date();
    const periodStart = getPeriodStart(periodDays, now);

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
      this.dashboardRepository.getVoucherTotals(),
      this.dashboardRepository.getPeriodVoucherStats(periodStart),
      this.vouchersService.getExpiringSoonCount(),
      this.dashboardRepository.getStalledSessionsCount(now),
      this.dashboardRepository.getSessionTotals(),
      this.dashboardRepository.getPeriodSessionStats(periodStart),
      this.dashboardRepository.getDailyActivity(periodStart),
      this.dashboardRepository.getTopResultsDistribution(),
      this.categoriesService.findAll(),
      this.getAdminActivity(10),
    ]);

    const resultsDistribution = formatResultsDistribution(
      categories,
      distributionRows,
    );

    return buildOverviewPayload({
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

  async getBehavioralTrends(params: {
    scope: string;
    id?: string;
    period: number;
    from?: string;
    to?: string;
  }): Promise<BehavioralTrends> {
    const now = new Date();
    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    if (params.from) {
      periodStart = new Date(params.from);
    } else {
      periodStart = getPeriodStart(params.period, now);
    }

    if (params.to) {
      periodEnd = new Date(params.to);
    }

    const result = await this.dashboardRepository.getBehavioralTrends(
      params.scope === 'institution' ? params.id : undefined,
      periodStart,
      periodEnd,
    );

    return {
      selectivityDistribution: result.selectivityDistribution,
      fatigueRate:
        result.eligibleSessions > 0
          ? result.fatiguedCount / result.eligibleSessions
          : null,
      rushRate:
        result.eligibleSessions > 0
          ? result.rushCount / result.eligibleSessions
          : null,
      avgReliabilityScore: result.avgReliabilityScore,
      totalSessions: result.totalSessions,
      eligibleSessions: result.eligibleSessions,
      trends: { daily: result.dailyTrends },
    };
  }

  async getAdminActivity(
    limit = DEFAULT_ACTIVITY_LIMIT,
  ): Promise<AdminActivityItem[]> {
    const [sessionRows, voucherActivity] = await Promise.all([
      this.dashboardRepository.getRecentSessionRows(limit),
      this.vouchersService.getRecentActivity(limit),
    ]);

    const sessionActivity = formatSessionActivity(sessionRows);
    return mergeActivity(sessionActivity, voucherActivity, limit);
  }
}
