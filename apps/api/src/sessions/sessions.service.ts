import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, In } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session, SessionPaymentStatus } from './entities/session.entity';

import { PdfService } from '../common/services/pdf.service';
import { StorageService } from '../common/services/storage.service';
import {
  AdminDashboardService,
  DashboardStatsPayload,
} from './services/admin-dashboard.service';
import { ReportService } from './services/report.service';
import { ReportOrchestratorService } from './services/report-orchestrator.service';
import type { QueueAdapter } from '../common/adapters/queue.adapter';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants';
import { JobNames, SendReportJobPayload } from '../common/jobs';
import { SessionMetricsService } from './services/session-metrics.service';
import { SessionScope } from './types/session-scope.type';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly mailService: MailService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly reportService: ReportService,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly reportOrchestratorService: ReportOrchestratorService,
    private readonly sessionMetricsService: SessionMetricsService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    const savedSession = await this.sessionRepository.save(session);

    // Calcular métricas automáticamente
    try {
      await this.sessionMetricsService.calculateAndSaveMetrics(savedSession.id);
    } catch (error) {
      this.logger.warn(
        `Failed to calculate metrics for session ${savedSession.id}:`,
        error,
      );
    }

    return savedSession;
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
    voucherId?: string | null,
    scope?: SessionScope,
  ): Promise<{
    success: boolean;
    message: string;
    localReportPath?: string;
  }> {
    const session = await this.findOne(sessionId, scope);
    const effectiveTargetEmail = this.resolveReportTargetEmail(
      targetEmail,
      scope,
    );

    if (!effectiveTargetEmail) {
      throw new BadRequestException(
        'Se requiere un correo de destino válido para enviar el informe',
      );
    }

    if (this.queueAdapter.isConfigured()) {
      const normalizedScope = scope
        ? {
            role: scope.role,
            email: scope.email,
            patientId: scope.patientId,
            therapistUserId: scope.therapistUserId,
            institutionId: scope.institutionId ?? undefined,
          }
        : undefined;
      const payload: SendReportJobPayload = {
        jobId: `report-${session.id}-${Date.now()}`,
        attempts: 3,
        backoffMs: 60_000,
        backoffType: 'exponential',
        timeoutMs: 90_000,
        concurrencyKey: 'report',
        concurrencyLimit: 2,
        sessionId: session.id,
        voucherId: voucherId ?? null,
        targetEmail: effectiveTargetEmail,
        scope: normalizedScope,
      };
      await this.queueAdapter.enqueue(JobNames.SendReport, payload, {
        attempts: payload.attempts,
        backoffMs: payload.backoffMs,
        backoffType: payload.backoffType,
        timeoutMs: payload.timeoutMs,
        concurrencyKey: payload.concurrencyKey,
        concurrencyLimit: payload.concurrencyLimit,
      });
      return {
        success: true,
        message: `Email encolado hacia ${effectiveTargetEmail}`,
      };
    }

    return await this.reportOrchestratorService.sendReport(
      session.id,
      effectiveTargetEmail,
      voucherId,
      scope,
    );
  }

  private resolveReportTargetEmail(
    requestedEmail: string | null | undefined,
    scope?: SessionScope,
  ): string {
    const role = scope?.role?.toUpperCase();
    const normalizedRequested = requestedEmail?.trim() || '';
    const normalizedScopeEmail = scope?.email?.trim() || '';

    if (role === 'PATIENT') {
      if (!normalizedScopeEmail) {
        throw new ForbiddenException(
          'No se pudo validar el correo del usuario autenticado',
        );
      }
      if (
        normalizedRequested &&
        normalizedRequested.toLowerCase() !== normalizedScopeEmail.toLowerCase()
      ) {
        throw new ForbiddenException(
          'No tienes permisos para enviar el informe a un correo distinto al tuyo',
        );
      }
      return normalizedScopeEmail;
    }

    return normalizedRequested || normalizedScopeEmail;
  }

  async getAdminOverview(days: number = 7): Promise<DashboardStatsPayload> {
    return await this.adminDashboardService.getAdminOverview(days);
  }

  async getAdminActivity(
    limit: number = 50,
  ): Promise<DashboardStatsPayload['activity']> {
    return await this.adminDashboardService.getAdminActivity(limit);
  }

  private buildScopedWhere(
    scope?: SessionScope,
    sessionId?: string,
  ): FindOptionsWhere<Session> | FindOptionsWhere<Session>[] | undefined {
    const normalizedRole = scope?.role?.toUpperCase();
    const scopedPatientId = this.isUuid(scope?.patientId)
      ? scope?.patientId
      : undefined;
    const scopedTherapistUserId = this.isUuid(scope?.therapistUserId)
      ? scope?.therapistUserId
      : undefined;
    const scopedInstitutionId = this.isUuid(scope?.institutionId)
      ? scope?.institutionId
      : undefined;

    if (normalizedRole === 'ADMIN') {
      const adminWhere: FindOptionsWhere<Session> = {
        paymentStatus: In([
          SessionPaymentStatus.PAID,
          SessionPaymentStatus.VOUCHER_REDEEMED,
        ]),
      };
      return sessionId ? { ...adminWhere, id: sessionId } : adminWhere;
    }

    const scopedWhere =
      normalizedRole === 'PATIENT' && scopedPatientId
        ? { patientId: scopedPatientId }
        : scopedTherapistUserId && scopedInstitutionId
          ? [
              { therapistUserId: scopedTherapistUserId },
              { institutionId: scopedInstitutionId },
            ]
          : scopedTherapistUserId
            ? { therapistUserId: scopedTherapistUserId }
            : scopedInstitutionId
              ? { institutionId: scopedInstitutionId }
              : { id: '__forbidden__' };

    if (sessionId) {
      if (Array.isArray(scopedWhere)) {
        return scopedWhere.map((condition) => ({
          ...condition,
          id: sessionId,
        }));
      }
      return { ...scopedWhere, id: sessionId };
    }
    return scopedWhere;
  }

  private isUuid(value?: string | null): value is string {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
