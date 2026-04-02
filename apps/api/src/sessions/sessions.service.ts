import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Between,
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
  testsStartedPeriod: number;
  testsCompletedPeriod: number;
  voucherRedemptionRatePeriod: number;
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
    const sessions = await this.sessionRepository.find({
      relations: ['results'],
      order: { createdAt: 'DESC' },
    });

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
    ]);

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (session) => (session.results?.length ?? 0) > 0,
    ).length;
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const totalTimeMs = sessions.reduce(
      (acc, session) => acc + Number(session.totalTimeMs || 0),
      0,
    );
    const averageTimeSeconds =
      totalSessions > 0 ? Math.floor(totalTimeMs / totalSessions / 1000) : 0;

    const isCompletedSession = (session: Session) =>
      (session.results?.length ?? 0) > 0;
    const isVoucherFlow = (session: Session) =>
      Boolean(session.voucherId) ||
      session.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED;

    const periodSessions = sessions.filter(
      (session) => new Date(session.createdAt) >= periodStart,
    );
    const testsStartedPeriod = periodSessions.length;
    const testsCompletedPeriod =
      periodSessions.filter(isCompletedSession).length;

    const periodUnlockedSessions = sessions.filter(
      (session) =>
        Boolean(session.reportUnlockedAt) &&
        new Date(session.reportUnlockedAt as Date) >= periodStart,
    );

    const voucherStartedPeriod = periodSessions.filter(isVoucherFlow).length;
    const voucherCompletedPeriod = periodSessions.filter(
      (session) => isVoucherFlow(session) && isCompletedSession(session),
    ).length;
    const voucherUnlockedPeriod =
      periodUnlockedSessions.filter(isVoucherFlow).length;

    const individualStartedPeriod =
      periodSessions.length - voucherStartedPeriod;
    const individualCompletedPeriod = periodSessions.filter(
      (session) => !isVoucherFlow(session) && isCompletedSession(session),
    ).length;
    const individualUnlockedPeriod =
      periodUnlockedSessions.length - voucherUnlockedPeriod;

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

    sessions.forEach((session) => {
      const key = new Date(session.createdAt).toISOString().slice(0, 10);
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
      }
    });

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

    sessions.forEach((session) => {
      session.results?.forEach((result) => {
        const key = result.categoryId.toUpperCase();
        distributionBuckets.set(key, (distributionBuckets.get(key) ?? 0) + 1);
      });
    });

    const resultsDistribution = Array.from(distributionBuckets.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const stalledSessions = sessions.filter(
      (session) =>
        (session.results?.length ?? 0) === 0 &&
        new Date(session.createdAt) < dayAgo,
    ).length;

    const alerts: DashboardStatsPayload['alerts'] = [];
    const lowStockThreshold = 20;
    const lowRedemptionRateThreshold = 15;
    const minIssuedForRateAlert = 5;

    if (availableVouchers === 0) {
      alerts.push({
        id: 'vouchers-out',
        severity: 'critical',
        title: 'Sin vouchers disponibles',
        description: 'No hay créditos listos para asignar nuevos tests.',
        actionLabel: 'Emitir lote',
        actionPath: '/dashboard/vouchers?create=true',
      });
    }

    if (availableVouchers > 0 && availableVouchers <= lowStockThreshold) {
      alerts.push({
        id: 'vouchers-low-stock',
        severity: 'warning',
        title: 'Stock de vouchers bajo',
        description: `Quedan ${availableVouchers} voucher(es) disponibles. Se recomienda emitir un nuevo lote.`,
        actionLabel: 'Emitir lote',
        actionPath: '/dashboard/vouchers?create=true',
      });
    }

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
      testsStartedPeriod,
      testsCompletedPeriod,
      voucherRedemptionRatePeriod,
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
      this.sessionRepository.find({
        relations: ['results'],
        order: { createdAt: 'DESC' },
        take: normalizedLimit,
      }),
      this.voucherRepository.find({
        order: { createdAt: 'DESC' },
        take: normalizedLimit,
      }),
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

    const sessionEvents: AdminActivityItem[] = recentSessions.map((session) => {
      const isCompleted = (session.results?.length ?? 0) > 0;
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
        description: `Paciente: ${session.patientName || 'Sin nombre'}`,
        occurredAt,
      };
    });

    const voucherEvents: AdminActivityItem[] = recentVouchers.map((voucher) => {
      const redeemed =
        Boolean(voucher.redeemedAt) || voucher.status === VoucherStatus.USED;
      const occurredAt = redeemed
        ? toIso(voucher.redeemedAt, voucher.sentAt, voucher.createdAt)
        : toIso(voucher.sentAt, voucher.createdAt);
      return {
        id: `voucher-${voucher.id}`,
        type: redeemed ? 'VOUCHER_REDEEMED' : 'VOUCHER_ISSUED',
        title: redeemed ? 'Voucher canjeado' : 'Voucher emitido',
        description: `Código ${voucher.code}`,
        occurredAt,
      };
    });

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
