import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Brackets,
  FindOptionsWhere,
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { CategoryResult, MailService } from '../mail/mail.service';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { VoucherStatus } from '../vouchers/entities/voucher.enums';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session, SessionPaymentStatus } from './entities/session.entity';

import { PdfService } from '../common/services/pdf.service';
import { StorageService } from '../common/services/storage.service';

type SessionScope = {
  role?: string;
  therapistUserId?: string;
  patientId?: string;
  institutionId?: string | null;
};

type DashboardStatsPayload = {
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
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    private categoriesService: CategoriesService,
    private mailService: MailService,
    private pdfService: PdfService,
    private storageService: StorageService,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    return await this.sessionRepository.save(session);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    scope?: SessionScope,
  ): Promise<{ data: Session[]; count: number }> {
    const where = this.buildScopedWhere(scope);

    const [data, count] = await this.sessionRepository.findAndCount({
      relations: ['results', 'institution', 'therapist', 'voucher'],
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, count };
  }

  async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: this.buildScopedWhere(scope, id),
      relations: ['results', 'swipes', 'institution', 'therapist', 'voucher'],
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async sendReport(
    sessionId: string,
    targetEmail: string,
    scope?: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId, scope);
    const categories = await this.categoriesService.findAll();

    const topResults = (session.results || [])
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const formattedResults: CategoryResult[] = topResults.map((res) => {
      const catInfo = categories.find((c) => c.categoryId === res.categoryId);
      const description = catInfo
        ? catInfo.description
        : 'Información no disponible.';

      const parsedBlocks = description
        .split('\n\n')
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => {
          let subtitle = '';
          let content = b;
          const colonIndex = b.indexOf(':');
          if (colonIndex > 0 && colonIndex < 80) {
            subtitle = b.slice(0, colonIndex).trim();
            content = b.slice(colonIndex + 1).trim();
          }
          return { subtitle, content };
        });

      return {
        title: catInfo ? catInfo.title : res.categoryId,
        percentage: res.percentage,
        description,
        parsedBlocks,
        suggestedCareers: res.suggestedCareers,
        materialSnippet: res.materialSnippet,
      };
    });

    const htmlContent = this.mailService.renderReportTemplate(
      session.patientName,
      formattedResults,
      session.hollandCode ?? undefined,
    );

    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);

      const fileName = `report_${sessionId}_${Date.now()}.pdf`;
      const reportUrl = await this.storageService.uploadFile(
        pdfBuffer,
        fileName,
      );

      // Persistir la URL en la sesión solo si se generó (S3 configurado)
      if (reportUrl) {
        session.reportUrl = reportUrl;
        await this.sessionRepository.save(session);
      }
    } catch (err) {
      console.error(
        '⚠️ Falló la generación o subida del PDF, se enviará solo HTML:',
        err,
      );
    }

    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      session.patientName,
      formattedResults,
      session.hollandCode ?? undefined,
      pdfBuffer,
    );

    if (!sent) {
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    return { success: true, message: `Email despachado hacia ${targetEmail}` };
  }

  async getAdminOverview(): Promise<DashboardStatsPayload> {
    const now = new Date();
    const periodDays = 7;
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - (periodDays - 1));

    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const parseIntSafe = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const parseBigNumberSafe = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

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

    const totalSessions = parseIntSafe(totalsRow?.totalSessions);
    const completedSessions = parseIntSafe(completedRow?.completedSessions);
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const totalTimeMs = parseBigNumberSafe(totalsRow?.totalTimeMs);
    const averageTimeSeconds =
      totalSessions > 0 ? Math.floor(totalTimeMs / totalSessions / 1000) : 0;

    const testsStartedPeriod = parseIntSafe(testsStartedRow?.count);
    const testsCompletedPeriod = parseIntSafe(testsCompletedRow?.count);
    const reportsUnlockedPeriod = parseIntSafe(reportsUnlockedRow?.count);

    const voucherStartedPeriod = parseIntSafe(voucherStartedRow?.count);
    const voucherCompletedPeriod = parseIntSafe(voucherCompletedRow?.count);
    const voucherUnlockedPeriod = parseIntSafe(voucherUnlockedRow?.count);

    const individualStartedPeriod = testsStartedPeriod - voucherStartedPeriod;
    const individualCompletedPeriod = parseIntSafe(
      individualCompletedRow?.count,
    );
    const individualUnlockedPeriod =
      reportsUnlockedPeriod - voucherUnlockedPeriod;

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
        dayBuckets.set(key, parseIntSafe(row.count));
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
      distributionBuckets.set(key, parseIntSafe(row.count));
    }

    const resultsDistribution = Array.from(distributionBuckets.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const stalledSessions = parseIntSafe(stalledRow?.count);

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

    const parseIntSafe = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

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

    const toIso = (
      ...values: Array<Date | string | null | undefined>
    ): string => {
      for (const value of values) {
        if (!value) {
          continue;
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }

      // Never fallback to "now"; use epoch if all dates are missing/invalid.
      return new Date(0).toISOString();
    };

    const describeSessionChannel = (session: {
      voucherId: string | null;
      paymentStatus: SessionPaymentStatus | null;
    }): string =>
      session.voucherId ||
      session.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
        ? 'con voucher'
        : 'sin voucher';

    const describeVoucherOwner = (voucher: {
      ownerInstitutionName: string | null;
      ownerUserName: string | null;
    }): string => {
      const institutionName = voucher.ownerInstitutionName?.trim();
      const ownerName = voucher.ownerUserName?.trim();

      if (institutionName) {
        return institutionName;
      }

      if (ownerName) {
        return ownerName;
      }

      return 'cliente no informado';
    };

    const sessionEvents: AdminActivityItem[] = (recentSessions ?? []).map(
      (session) => {
        const isCompleted = parseIntSafe(session.resultsCount) > 0;
        const channelLabel = describeSessionChannel(session);
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
      },
    );

    const voucherEvents: AdminActivityItem[] = (recentVouchers ?? []).map(
      (voucher) => {
        const redeemed =
          Boolean(voucher.redeemedAt) || voucher.status === VoucherStatus.USED;
        const ownerLabel = describeVoucherOwner(voucher);
        const occurredAt = redeemed
          ? toIso(voucher.redeemedAt, voucher.sentAt, voucher.createdAt)
          : toIso(voucher.sentAt, voucher.createdAt);
        return {
          id: `voucher-${voucher.id}`,
          type: redeemed ? 'VOUCHER_REDEEMED' : 'VOUCHER_ISSUED',
          title: redeemed ? 'Voucher canjeado' : 'Voucher emitido',
          description: redeemed
            ? `El código ${voucher.code} fue canjeado para ${ownerLabel}.`
            : `Se emitió el código ${voucher.code} para ${ownerLabel}.`,
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

  private buildScopedWhere(
    scope?: SessionScope,
    sessionId?: string,
  ): FindOptionsWhere<Session> | undefined {
    const normalizedRole = scope?.role?.toUpperCase();

    if (normalizedRole === 'ADMIN') {
      return sessionId ? { id: sessionId } : undefined;
    }

    const scopedWhere =
      normalizedRole === 'PATIENT' && scope?.patientId
        ? { patientId: scope.patientId }
        : scope?.therapistUserId
          ? { therapistUserId: scope.therapistUserId }
          : scope?.institutionId
            ? { institutionId: scope.institutionId }
            : { id: '__forbidden__' };

    return sessionId ? { ...scopedWhere, id: sessionId } : scopedWhere;
  }
}
