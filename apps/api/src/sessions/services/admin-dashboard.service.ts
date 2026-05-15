import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../../categories/categories.service.js';
import { SessionsService } from '../sessions.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import {
  DashboardStatsPayload,
  AdminActivityItem,
} from '../types/dashboard.types.js';
import { AdminDashboardStatsService } from './admin-dashboard-stats.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly sessionsService: SessionsService,
    private readonly vouchersService: VouchersService,
    private readonly statsService: AdminDashboardStatsService,
  ) {}

  async getAdminOverview(
    periodDays: number = 7,
  ): Promise<DashboardStatsPayload> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - (periodDays - 1));

    const [
      voucherTotals,
      periodVoucherStats,
      expiringSoonCount,
      stalledSessionsCount,
      historicalTotals,
      completedTotal,
      periodBasicStats,
      periodChannelStats,
      individualCompletedCount,
      dailyActivityRows,
      resultsDistribution,
      activity,
    ] = await Promise.all([
      this.statsService.getVoucherTotals(),
      this.statsService.getPeriodVoucherStats(periodStart),
      this.vouchersService.getExpiringSoonCount(),
      this.sessionsService.getStalledSessionsCount(),
      this.statsService.getHistoricalSessionTotals(),
      this.statsService.getCompletedSessionsTotal(),
      this.statsService.getPeriodBasicStats(periodStart),
      this.statsService.getPeriodChannelStats(periodStart),
      this.statsService.getIndividualCompletedStats(periodStart),
      this.statsService.getDailyActivity(periodStart),
      this.getResultsDistribution(),
      this.getAdminActivity(10),
    ]);

    const totalSessions = this.parseIntSafe(historicalTotals.totalSessions);
    const completedSessions = this.parseIntSafe(
      completedTotal.completedSessions,
    );
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const totalTimeMs = this.parseBigNumberSafe(historicalTotals.totalTimeMs);
    const averageTimeSeconds =
      totalSessions > 0 ? Math.floor(totalTimeMs / totalSessions / 1000) : 0;

    const voucherRedemptionRatePeriod =
      periodVoucherStats.issued > 0
        ? Math.round(
            (periodVoucherStats.redeemed / periodVoucherStats.issued) * 100,
          )
        : 0;

    const sessionsActivity = this.formatDailyActivity(dailyActivityRows, now);

    const alerts = this.calculateAlerts({
      expiringSoonVouchers: expiringSoonCount,
      stalledSessions: stalledSessionsCount,
      issuedVouchersPeriod: periodVoucherStats.issued,
      voucherRedemptionRatePeriod,
    });

    return {
      totalSessions,
      totalHistoricalVouchers: voucherTotals.historical,
      completionRate,
      averageTimeSeconds,
      availableVouchers: voucherTotals.available,
      redeemedVouchers: voucherTotals.redeemed,
      periodDays,
      periodLabel: `Ultimos ${periodDays} dias`,
      vouchersGeneratedPeriod: periodVoucherStats.issued,
      vouchersRedeemedPeriod: periodVoucherStats.redeemed,
      testsStartedPeriod: periodBasicStats.started,
      testsCompletedPeriod: periodBasicStats.completed,
      voucherRedemptionRatePeriod,
      reportsUnlockedPeriod: periodBasicStats.reportsUnlocked,
      channelBreakdown: {
        voucher: periodChannelStats,
        individual: {
          started: periodBasicStats.started - periodChannelStats.started,
          completed: individualCompletedCount,
          reportsUnlocked:
            periodBasicStats.reportsUnlocked -
            periodChannelStats.reportsUnlocked,
        },
      },
      sessionsActivity,
      resultsDistribution,
      alerts,
      activity,
    };
  }

  async getAdminActivity(limit: number = 50): Promise<AdminActivityItem[]> {
    const [sessionActivity, voucherActivity] = await Promise.all([
      this.sessionsService.getRecentActivity(limit),
      this.vouchersService.getRecentActivity(limit),
    ]);

    return [...sessionActivity, ...voucherActivity]
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, limit);
  }

  private calculateAlerts(context: {
    expiringSoonVouchers: number;
    stalledSessions: number;
    issuedVouchersPeriod: number;
    voucherRedemptionRatePeriod: number;
  }): DashboardStatsPayload['alerts'] {
    const alerts: DashboardStatsPayload['alerts'] = [];
    const lowRedemptionRateThreshold = 15;
    const minIssuedForRateAlert = 5;

    if (context.expiringSoonVouchers > 0) {
      alerts.push({
        id: 'vouchers-expiring',
        severity: 'warning',
        title: 'Vouchers próximos a vencer',
        description: `${context.expiringSoonVouchers} voucher(es) vencen en los próximos 7 días.`,
        actionLabel: 'Revisar vouchers',
        actionPath: '/dashboard/vouchers',
      });
    }

    if (context.stalledSessions > 0) {
      alerts.push({
        id: 'stalled-sessions',
        severity: 'info',
        title: 'Sesiones pendientes de cierre',
        description: `${context.stalledSessions} sesión(es) siguen sin resultados luego de 24h.`,
        actionLabel: 'Ver resultados',
        actionPath: '/dashboard/results',
      });
    }

    if (
      context.issuedVouchersPeriod >= minIssuedForRateAlert &&
      context.voucherRedemptionRatePeriod < lowRedemptionRateThreshold
    ) {
      alerts.push({
        id: 'voucher-redemption-low',
        severity: 'warning',
        title: 'Canje de vouchers por debajo del objetivo',
        description: `La tasa de canje del periodo es ${context.voucherRedemptionRatePeriod}%. Objetivo minimo recomendado: ${lowRedemptionRateThreshold}%.`,
        actionLabel: 'Ver sesiones',
        actionPath: '/dashboard/results',
      });
    }

    return alerts;
  }

  private async getResultsDistribution() {
    const [categories, distributionRows] = await Promise.all([
      this.categoriesService.findAll(),
      this.statsService.getTopResultsDistribution(),
    ]);

    const categoryNames = new Map(
      categories.map((c) => [c.categoryId.toUpperCase(), c.title]),
    );

    const distributionBuckets = new Map<string, number>();
    categoryNames.forEach((_, id) => distributionBuckets.set(id, 0));

    for (const row of distributionRows) {
      const key = String(row.categoryId ?? '').toUpperCase();
      if (key && distributionBuckets.has(key)) {
        distributionBuckets.set(key, this.parseIntSafe(row.count));
      }
    }

    return Array.from(distributionBuckets.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private formatDailyActivity(rows: any[], now: Date) {
    const dayBuckets = new Map<string, number>();
    const dayKeys: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      dayKeys.push(key);
      dayBuckets.set(key, 0);
    }

    for (const row of rows) {
      const key = String(row.day ?? '');
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, this.parseIntSafe(row.count));
      }
    }

    return dayKeys.map((key) => {
      const date = new Date(`${key}T00:00:00`);
      return {
        date: date.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
        }),
        count: dayBuckets.get(key) ?? 0,
      };
    });
  }

  private parseIntSafe(value: unknown): number {
    if (typeof value === 'number') return Math.trunc(value);
    if (typeof value === 'string') return parseInt(value, 10) || 0;
    return 0;
  }

  private parseBigNumberSafe(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
    return 0;
  }
}
