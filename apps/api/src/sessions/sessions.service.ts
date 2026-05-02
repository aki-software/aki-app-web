import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    const savedSession = await this.sessionRepository.save(session);
    
    // Calcular métricas automáticamente
    try {
      await this.sessionMetricsService.calculateAndSaveMetrics(savedSession.id);
    } catch (error) {
      this.logger.warn(`Failed to calculate metrics for session ${savedSession.id}:`, error);
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
    scope?: SessionScope,
  ): Promise<{
    success: boolean;
    message: string;
    localReportPath?: string;
  }> {
    return await this.reportOrchestratorService.sendReport(sessionId, targetEmail, scope);
  }

  async getAdminOverview(): Promise<DashboardStatsPayload> {
    return await this.adminDashboardService.getAdminOverview();
  }

  async getAdminActivity(limit: number = 50): Promise<DashboardStatsPayload['activity']> {
    return await this.adminDashboardService.getAdminActivity(limit);
  }

  private buildScopedWhere(
    scope?: SessionScope,
    sessionId?: string,
  ): FindOptionsWhere<Session> | FindOptionsWhere<Session>[] | undefined {
    const normalizedRole = scope?.role?.toUpperCase();

    if (normalizedRole === 'ADMIN') {
      const adminWhere: FindOptionsWhere<Session> = {
        paymentStatus: In([SessionPaymentStatus.PAID, SessionPaymentStatus.VOUCHER_REDEEMED]),
      };
      return sessionId ? { ...adminWhere, id: sessionId } : adminWhere;
    }

    const scopedWhere =
      normalizedRole === 'PATIENT' && scope?.patientId
        ? { patientId: scope.patientId }
        : scope?.therapistUserId && scope?.institutionId
          ? [
              { therapistUserId: scope.therapistUserId },
              { institutionId: scope.institutionId },
            ]
          : scope?.therapistUserId
            ? { therapistUserId: scope.therapistUserId }
            : scope?.institutionId
              ? { institutionId: scope.institutionId }
              : { id: '__forbidden__' };

    if (sessionId) {
      if (Array.isArray(scopedWhere)) {
        return scopedWhere.map((condition) => ({ ...condition, id: sessionId }));
      }
      return { ...scopedWhere, id: sessionId };
    }
    return scopedWhere;
  }
}
