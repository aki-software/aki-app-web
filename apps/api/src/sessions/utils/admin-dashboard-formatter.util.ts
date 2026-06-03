import {
  AdminActivityItem,
  CategoryResponse,
  DashboardStatsPayload,
  RawRecentSessionRow,
  RawSessionsActivityRow,
  RawTopCategoryRow,
} from '@akit/contracts';
import { SessionPaymentStatus } from '../entities/session.entity.js';

export function getPeriodStart(periodDays: number, now: Date): Date {
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - (periodDays - 1));
  return periodStart;
}

export function buildOverviewPayload(input: {
  periodDays: number;
  now: Date;
  periodStart: Date;
  voucherTotals: { available: string; redeemed: string; historical: string };
  periodVoucherStats: { issued: string; redeemed: string };
  expiringSoonCount: number;
  stalledSessionsCount: number;
  sessionTotals: {
    totalSessions: string;
    totalTimeMs: string;
    completedSessions: string;
  };
  periodSessionStats: {
    started: string;
    completed: string;
    reportsUnlocked: string;
    voucherStarted: string;
    voucherCompleted: string;
    voucherReportsUnlocked: string;
    individualCompleted: string;
  };
  dailyActivityRows: RawSessionsActivityRow[];
  resultsDistribution: DashboardStatsPayload['resultsDistribution'];
  activity: AdminActivityItem[];
}): DashboardStatsPayload {
  const totalSessions = parseIntSafe(input.sessionTotals.totalSessions);
  const completedSessions = parseIntSafe(input.sessionTotals.completedSessions);
  const completionRate =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

  const totalTimeMs = parseBigNumberSafe(input.sessionTotals.totalTimeMs);
  const averageTimeSeconds =
    totalSessions > 0 ? Math.floor(totalTimeMs / totalSessions / 1000) : 0;

  const vouchersGeneratedPeriod = parseIntSafe(input.periodVoucherStats.issued);
  const vouchersRedeemedPeriod = parseIntSafe(
    input.periodVoucherStats.redeemed,
  );
  const voucherRedemptionRatePeriod =
    vouchersGeneratedPeriod > 0
      ? Math.round((vouchersRedeemedPeriod / vouchersGeneratedPeriod) * 100)
      : 0;

  const periodBasicStats = {
    started: parseIntSafe(input.periodSessionStats.started),
    completed: parseIntSafe(input.periodSessionStats.completed),
    reportsUnlocked: parseIntSafe(input.periodSessionStats.reportsUnlocked),
  };
  const periodVoucherStats = {
    started: parseIntSafe(input.periodSessionStats.voucherStarted),
    completed: parseIntSafe(input.periodSessionStats.voucherCompleted),
    reportsUnlocked: parseIntSafe(
      input.periodSessionStats.voucherReportsUnlocked,
    ),
  };
  const individualCompletedCount = parseIntSafe(
    input.periodSessionStats.individualCompleted,
  );

  const sessionsActivity = formatDailyActivity(
    input.dailyActivityRows,
    input.now,
  );
  const alerts = calculateAlerts({
    expiringSoonVouchers: input.expiringSoonCount,
    stalledSessions: input.stalledSessionsCount,
    issuedVouchersPeriod: vouchersGeneratedPeriod,
    voucherRedemptionRatePeriod,
  });

  return {
    totalSessions,
    totalHistoricalVouchers: parseIntSafe(input.voucherTotals.historical),
    completionRate,
    averageTimeSeconds,
    availableVouchers: parseIntSafe(input.voucherTotals.available),
    redeemedVouchers: parseIntSafe(input.voucherTotals.redeemed),
    periodDays: input.periodDays,
    periodLabel: `Ultimos ${input.periodDays} dias`,
    vouchersGeneratedPeriod,
    vouchersRedeemedPeriod,
    testsStartedPeriod: periodBasicStats.started,
    testsCompletedPeriod: periodBasicStats.completed,
    voucherRedemptionRatePeriod,
    reportsUnlockedPeriod: periodBasicStats.reportsUnlocked,
    channelBreakdown: {
      voucher: periodVoucherStats,
      individual: {
        started: periodBasicStats.started - periodVoucherStats.started,
        completed: individualCompletedCount,
        reportsUnlocked:
          periodBasicStats.reportsUnlocked - periodVoucherStats.reportsUnlocked,
      },
    },
    sessionsActivity,
    resultsDistribution: input.resultsDistribution,
    alerts,
    activity: input.activity,
  };
}

export function mergeActivity(
  sessionActivity: AdminActivityItem[],
  voucherActivity: AdminActivityItem[],
  limit: number,
): AdminActivityItem[] {
  return [...sessionActivity, ...voucherActivity]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}

export function formatSessionActivity(
  rows: RawRecentSessionRow[],
): AdminActivityItem[] {
  return rows.map((session) => {
    const resultsCount = parseInt(session.resultsCount ?? '0', 10);
    const isCompleted = resultsCount > 0;
    const channelLabel =
      session.voucherId ||
      session.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
        ? 'con voucher'
        : 'sin voucher';
    const occurredAt = isCompleted
      ? toIso(
          session.reportUnlockedAt,
          session.paidAt,
          session.sessionDate,
          session.createdAt,
        )
      : toIso(session.sessionDate, session.createdAt);

    return {
      id: `session-${session.id}`,
      type: isCompleted ? 'SESSION_COMPLETED' : 'SESSION_STARTED',
      title: isCompleted ? 'Sesión completada' : 'Sesión iniciada',
      description: isCompleted
        ? `${session.patientName || 'Paciente sin nombre'} completó un test ${channelLabel}.`
        : `${session.patientName || 'Paciente sin nombre'} inició un test ${channelLabel}.`,
      occurredAt,
    };
  });
}

export function formatResultsDistribution(
  categories: CategoryResponse[],
  distributionRows: RawTopCategoryRow[],
): DashboardStatsPayload['resultsDistribution'] {
  const categoryNames = new Map(
    categories.map((c) => [c.categoryId.toUpperCase(), c.title]),
  );

  const distributionBuckets = new Map<string, number>();
  categoryNames.forEach((_, id) => distributionBuckets.set(id, 0));

  for (const row of distributionRows) {
    const key = String(row.categoryId ?? '').toUpperCase();
    if (key && distributionBuckets.has(key)) {
      distributionBuckets.set(key, parseIntSafe(row.count));
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

function calculateAlerts(context: {
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

function formatDailyActivity(rows: RawSessionsActivityRow[], now: Date) {
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
      dayBuckets.set(key, parseIntSafe(row.count));
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

function toIso(...values: Array<Date | string | null | undefined>): string {
  for (const value of values) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date(0).toISOString();
}

function parseIntSafe(value: unknown): number {
  if (typeof value === 'number') return Math.trunc(value);
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

function parseBigNumberSafe(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}
