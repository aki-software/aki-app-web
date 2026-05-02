import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Brackets,
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CategoriesService } from '../../categories/categories.service';
import { Voucher } from '../../vouchers/entities/voucher.entity';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums';
import { Session, SessionPaymentStatus } from '../entities/session.entity';

export type DashboardStatsPayload = {
  totalSessions: number;
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

type AdminActivityItem = DashboardStatsPayload['activity'][number];

type RawCountRow = { count: string };
type RawTotalsRow = { totalSessions: string; totalTimeMs: string };
type RawCompletedSessionsRow = { completedSessions: string };
type RawSessionsActivityRow = { day: string; count: string };
type RawTopCategoryRow = { categoryId: string; count: string };

type RawRecentSessionRow = {
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

type RawRecentVoucherRow = {
  id: string;
  code: string;
  status: VoucherStatus;
  createdAt: Date | string;
  sentAt: Date | string | null;
  redeemedAt: Date | string | null;
  ownerInstitutionName: string | null;
  ownerUserName: string | null;
};

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async getAdminOverview(): Promise<DashboardStatsPayload> {
    const now = new Date();
    const periodDays = 7;
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - (periodDays - 1));

    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [
      availableVouchers,
      redeemedVouchers,
      issuedVouchersPeriod,
      redeemedVouchersPeriod,
      expiringSoonVouchers,
      activity,
      totalsRow,
      completedRow,
      testsStartedRow,
      testsCompletedRow,
      reportsUnlockedRow,
      voucherStartedRow,
      voucherCompletedRow,
      voucherUnlockedRow,
      individualCompletedRow,
      sessionsActivityRows,
      stalledRow,
    ] = await Promise.all([
      this.voucherRepository.count({
        where: { status: VoucherStatus.AVAILABLE },
      }),
      this.voucherRepository.count({ where: { status: VoucherStatus.USED } }),
      this.voucherRepository.count({
        where: { createdAt: MoreThanOrEqual(periodStart) },
      }),
      this.voucherRepository.count({
        where: {
          status: VoucherStatus.USED,
          redeemedAt: MoreThanOrEqual(periodStart),
        },
      }),
      this.voucherRepository.count({
        where: {
          status: In([VoucherStatus.AVAILABLE, VoucherStatus.SENT]),
          expiresAt: Between(now, weekAhead),
        },
      }),
      this.getAdminActivity(10),
      this.sessionRepository
        .createQueryBuilder('session')
        .select('COUNT(*)', 'totalSessions')
        .addSelect(
          'COALESCE(SUM(COALESCE(session.totalTimeMs, 0)), 0)',
          'totalTimeMs',
        )
        .getRawOne<RawTotalsRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .select('COUNT(DISTINCT session.id)', 'completedSessions')
        .getRawOne<RawCompletedSessionsRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt >= :periodStart', { periodStart })
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .where('session.createdAt >= :periodStart', { periodStart })
        .select('COUNT(DISTINCT session.id)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.reportUnlockedAt IS NOT NULL')
        .andWhere('session.reportUnlockedAt >= :periodStart', { periodStart })
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((qb) => {
            qb.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              {
                voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
              },
            );
          }),
        )
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .where('session.createdAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((qb) => {
            qb.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              {
                voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
              },
            );
          }),
        )
        .select('COUNT(DISTINCT session.id)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.reportUnlockedAt IS NOT NULL')
        .andWhere('session.reportUnlockedAt >= :periodStart', { periodStart })
        .andWhere(
          new Brackets((qb) => {
            qb.where('session.voucherId IS NOT NULL').orWhere(
              'session.paymentStatus = :voucherRedeemedStatus',
              {
                voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
              },
            );
          }),
        )
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.results', 'result')
        .where('session.createdAt >= :periodStart', { periodStart })
        .andWhere('session.voucherId IS NULL')
        .andWhere('session.paymentStatus != :voucherRedeemedStatus', {
          voucherRedeemedStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
        })
        .select('COUNT(DISTINCT session.id)', 'count')
        .getRawOne<RawCountRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .select(
          "to_char(session.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
          'day',
        )
        .addSelect('COUNT(*)', 'count')
        .where('session.createdAt >= :periodStart', { periodStart })
        .groupBy("to_char(session.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
        .orderBy('day', 'ASC')
        .getRawMany<RawSessionsActivityRow>(),
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.createdAt < :dayAgo', {
          dayAgo: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        })
        .andWhere((qb) => {
          const subquery = qb
            .subQuery()
            .select('1')
            .from('session_results', 'sr')
            .where('sr.session_id = session.id')
            .getQuery();
          return `NOT EXISTS (${subquery})`;
        })
        .select('COUNT(*)', 'count')
        .getRawOne<RawCountRow>(),
    ]);

    const totalSessions = this.parseIntSafe(totalsRow?.totalSessions);
    const completedSessions = this.parseIntSafe(completedRow?.completedSessions);
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const totalTimeMs = this.parseBigNumberSafe(totalsRow?.totalTimeMs);
    const averageTimeSeconds =
      totalSessions > 0 ? Math.floor(totalTimeMs / totalSessions / 1000) : 0;

    const testsStartedPeriod = this.parseIntSafe(testsStartedRow?.count);
    const testsCompletedPeriod = this.parseIntSafe(testsCompletedRow?.count);
    const reportsUnlockedPeriod = this.parseIntSafe(reportsUnlockedRow?.count);

    const voucherStartedPeriod = this.parseIntSafe(voucherStartedRow?.count);
    const voucherCompletedPeriod = this.parseIntSafe(voucherCompletedRow?.count);
    const voucherUnlockedPeriod = this.parseIntSafe(voucherUnlockedRow?.count);

    const individualStartedPeriod = testsStartedPeriod - voucherStartedPeriod;
    const individualCompletedPeriod = this.parseIntSafe(
      individualCompletedRow?.count,
    );
    const individualUnlockedPeriod = reportsUnlockedPeriod - voucherUnlockedPeriod;

    const voucherRedemptionRatePeriod =
      issuedVouchersPeriod > 0
        ? Math.round((redeemedVouchersPeriod / issuedVouchersPeriod) * 100)
        : 0;

    const dayBuckets = new Map<string, number>();
    const dayKeys: string[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(now);
      date.setDate(now.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      dayKeys.push(key);
      dayBuckets.set(key, 0);
    }

    for (const row of sessionsActivityRows ?? []) {
      const key = String(row.day ?? '');
      if (!key) {
        continue;
      }
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, this.parseIntSafe(row.count));
      }
    }

    const sessionsActivity = dayKeys.map((key) => {
      const date = new Date(`${key}T00:00:00`);
      const label = date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      });
      return { date: label, count: dayBuckets.get(key) ?? 0 };
    });

    const categories = await this.categoriesService.findAll();
    const categoryNames = new Map(
      categories.map((category) => [
        category.categoryId.toUpperCase(),
        category.title,
      ]),
    );
    const distributionBuckets = new Map<string, number>();
    categoryNames.forEach((_, categoryId) =>
      distributionBuckets.set(categoryId, 0),
    );

    const topResultsRows = await this.sessionRepository.manager
      .createQueryBuilder()
      .select('UPPER(t.category_id)', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .from(
        (sub) =>
          sub
            .select('sr.category_id', 'category_id')
            .addSelect('sr.session_id', 'session_id')
            .addSelect(
              'ROW_NUMBER() OVER (PARTITION BY sr.session_id ORDER BY sr.percentage DESC)',
              'rn',
            )
            .from('session_results', 'sr'),
        't',
      )
      .where('t.rn = 1')
      .groupBy('UPPER(t.category_id)')
      .getRawMany<RawTopCategoryRow>();

    for (const row of topResultsRows ?? []) {
      const key = String(row.categoryId ?? '').toUpperCase();
      if (!key) {
        continue;
      }
      distributionBuckets.set(key, this.parseIntSafe(row.count));
    }

    const resultsDistribution = Array.from(distributionBuckets.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const stalledSessions = this.parseIntSafe(stalledRow?.count);

    const alerts: DashboardStatsPayload['alerts'] = [];
    const lowRedemptionRateThreshold = 15;
    const minIssuedForRateAlert = 5;

    if (expiringSoonVouchers > 0) {
      alerts.push({
        id: 'vouchers-expiring',
        severity: 'warning',
        title: 'Vouchers próximos a vencer',
        description: `${expiringSoonVouchers} voucher(es) vencen en los próximos 7 días.`,
        actionLabel: 'Revisar vouchers',
        actionPath: '/dashboard/vouchers',
      });
    }

    if (stalledSessions > 0) {
      alerts.push({
        id: 'stalled-sessions',
        severity: 'info',
        title: 'Sesiones pendientes de cierre',
        description: `${stalledSessions} sesión(es) siguen sin resultados luego de 24h.`,
        actionLabel: 'Ver resultados',
        actionPath: '/dashboard/results',
      });
    }

    if (
      issuedVouchersPeriod >= minIssuedForRateAlert &&
      voucherRedemptionRatePeriod < lowRedemptionRateThreshold
    ) {
      alerts.push({
        id: 'voucher-redemption-low',
        severity: 'warning',
        title: 'Canje de vouchers por debajo del objetivo',
        description: `La tasa de canje del periodo es ${voucherRedemptionRatePeriod}%. Objetivo minimo recomendado: ${lowRedemptionRateThreshold}%.`,
        actionLabel: 'Ver sesiones',
        actionPath: '/dashboard/results',
      });
    }

    return {
      totalSessions,
      completionRate,
      averageTimeSeconds,
      availableVouchers,
      redeemedVouchers,
      periodDays,
      periodLabel: `Ultimos ${periodDays} dias`,
      vouchersGeneratedPeriod: issuedVouchersPeriod,
      vouchersRedeemedPeriod: redeemedVouchersPeriod,
      testsStartedPeriod,
      testsCompletedPeriod,
      voucherRedemptionRatePeriod,
      reportsUnlockedPeriod,
      channelBreakdown: {
        voucher: {
          started: voucherStartedPeriod,
          completed: voucherCompletedPeriod,
          reportsUnlocked: voucherUnlockedPeriod,
        },
        individual: {
          started: individualStartedPeriod,
          completed: individualCompletedPeriod,
          reportsUnlocked: individualUnlockedPeriod,
        },
      },
      sessionsActivity,
      resultsDistribution,
      alerts,
      activity,
    };
  }

  async getAdminActivity(limit: number = 50): Promise<AdminActivityItem[]> {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 200)
      : 50;

    const [recentSessions, recentVouchers] = await Promise.all([
      this.sessionRepository
        .createQueryBuilder('session')
        .select('session.id', 'id')
        .addSelect('session.patientName', 'patientName')
        .addSelect('session.createdAt', 'createdAt')
        .addSelect('session.sessionDate', 'sessionDate')
        .addSelect('session.reportUnlockedAt', 'reportUnlockedAt')
        .addSelect('session.paidAt', 'paidAt')
        .addSelect('session.voucherId', 'voucherId')
        .addSelect('session.paymentStatus', 'paymentStatus')
        .addSelect('COUNT(result.id)', 'resultsCount')
        .leftJoin('session.results', 'result')
        .groupBy('session.id')
        .addGroupBy('session.patientName')
        .addGroupBy('session.createdAt')
        .addGroupBy('session.sessionDate')
        .addGroupBy('session.reportUnlockedAt')
        .addGroupBy('session.paidAt')
        .addGroupBy('session.voucherId')
        .addGroupBy('session.paymentStatus')
        .orderBy('session.createdAt', 'DESC')
        .limit(normalizedLimit)
        .getRawMany<RawRecentSessionRow>(),
      this.voucherRepository
        .createQueryBuilder('voucher')
        .select('voucher.id', 'id')
        .addSelect('voucher.code', 'code')
        .addSelect('voucher.status', 'status')
        .addSelect('voucher.createdAt', 'createdAt')
        .addSelect('voucher.sentAt', 'sentAt')
        .addSelect('voucher.redeemedAt', 'redeemedAt')
        .addSelect('ownerInstitution.name', 'ownerInstitutionName')
        .addSelect('ownerUser.name', 'ownerUserName')
        .leftJoin('voucher.ownerInstitution', 'ownerInstitution')
        .leftJoin('voucher.ownerUser', 'ownerUser')
        .orderBy('voucher.createdAt', 'DESC')
        .limit(normalizedLimit)
        .getRawMany<RawRecentVoucherRow>(),
    ]);

    const sessionEvents: AdminActivityItem[] = (recentSessions ?? []).map(
      (session) => {
        const isCompleted = this.parseIntSafe(session.resultsCount) > 0;
        const channelLabel =
          session.voucherId ||
          session.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
            ? 'con voucher'
            : 'sin voucher';
        const occurredAt = isCompleted
          ? this.toIso(
              session.reportUnlockedAt,
              session.paidAt,
              session.sessionDate,
              session.createdAt,
            )
          : this.toIso(session.sessionDate, session.createdAt);

        return {
          id: `session-${session.id}`,
          type: isCompleted ? 'SESSION_COMPLETED' : 'SESSION_STARTED',
          title: isCompleted ? 'Sesión completada' : 'Sesión iniciada',
          description: isCompleted
            ? `${session.patientName || 'Paciente sin nombre'} completó un test ${channelLabel}.`
            : `${session.patientName || 'Paciente sin nombre'} inició un test ${channelLabel}.`,
          occurredAt,
        };
      },
    );

    const voucherEvents: AdminActivityItem[] = (recentVouchers ?? []).map(
      (voucher) => {
        const redeemed =
          Boolean(voucher.redeemedAt) || voucher.status === VoucherStatus.USED;
        const occurredAt = redeemed
          ? this.toIso(voucher.redeemedAt, voucher.sentAt, voucher.createdAt)
          : this.toIso(voucher.sentAt, voucher.createdAt);
        return {
          id: `voucher-${voucher.id}`,
          type: redeemed ? 'VOUCHER_REDEEMED' : 'VOUCHER_ISSUED',
          title: redeemed ? 'Voucher canjeado' : 'Voucher emitido',
          description: redeemed
            ? `El código ${voucher.code} fue canjeado para ${this.describeVoucherOwner(voucher)}.`
            : `Se emitió el código ${voucher.code} para ${this.describeVoucherOwner(voucher)}.`,
          occurredAt,
        };
      },
    );

    return [...sessionEvents, ...voucherEvents]
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, normalizedLimit);
  }

  private parseIntSafe(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private parseBigNumberSafe(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toIso(...values: Array<Date | string | null | undefined>): string {
    for (const value of values) {
      if (!value) {
        continue;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return new Date(0).toISOString();
  }

  private describeVoucherOwner(voucher: {
    ownerInstitutionName: string | null;
    ownerUserName: string | null;
  }): string {
    const institutionName = voucher.ownerInstitutionName?.trim();
    const ownerName = voucher.ownerUserName?.trim();

    if (institutionName) {
      return institutionName;
    }

    if (ownerName) {
      return ownerName;
    }

    return 'cliente no informado';
  }
}
