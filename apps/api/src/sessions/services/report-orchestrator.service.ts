import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportService } from './report.service.js';
import type { IReportCacheService } from '../interfaces/report-cache.interface.js';
import { ReportPdfService } from './report-pdf.service.js';
import { ReportDeliveryService } from './report-delivery.service.js';
import { SessionScope } from '../types/session-scope.type.js';
import type { ReportData } from '../../common/types/report.types.js';
import { SessionPaymentStatus } from '@akit/contracts';
import { UserRole } from '../../users/entities/user.entity.js';

const DELIVERY_CACHE_TTL_MS = 10 * 60 * 1000;
@Injectable()
export class ReportOrchestratorService {
  private readonly logger = new Logger(ReportOrchestratorService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly reportService: ReportService,
    @Inject('IReportCacheService')
    private readonly reportCacheService: IReportCacheService,
    private readonly reportPdfService: ReportPdfService,
    private readonly reportDeliveryService: ReportDeliveryService,
  ) {}

  async sendReport(
    sessionId: string,
    targetEmail: string,
    voucherId?: string | null,
    scope?: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId, scope);
    const voucherIdForLogging = voucherId ?? session.voucherId ?? undefined;
    const cacheKey = `report:${sessionId}:${targetEmail}`;

    const cached: {
      reportData: ReportData;
      pdfBuffer?: Buffer;
    } = await this.reportCacheService.getOrCreate(cacheKey, async () => {
      this.logger.debug(`Generating report for session: ${sessionId}`);

      const reportData = await this.reportService.buildReportData(
        session,
        targetEmail,
      );

      const pdfBuffer =
        await this.reportPdfService.generatePdfBuffer(reportData);

      return { reportData, pdfBuffer };
    });

    this.logger.debug(`Sending report for session: ${sessionId}`);

    const deliveryCacheKey = `delivery:${sessionId}:${targetEmail}`;
    const deliveryLockKey = `lock:${deliveryCacheKey}`;
    const previousResult = this.reportCacheService.get<{
      success: boolean;
      message: string;
    }>(deliveryCacheKey);
    if (previousResult) {
      this.logger.debug(
        `Delivery already completed for session: ${sessionId}, returning cached result`,
      );
      return previousResult;
    }

    return await this.reportCacheService.withLock(deliveryLockKey, async () => {
      const cachedDelivery = this.reportCacheService.get<{
        success: boolean;
        message: string;
      }>(deliveryCacheKey);
      if (cachedDelivery) {
        this.logger.debug(
          `Delivery already completed (post-lock check) for session: ${sessionId}`,
        );
        return cachedDelivery;
      }

      const result = await this.reportDeliveryService.deliverReport(
        targetEmail,
        sessionId,
        voucherIdForLogging,
        cached.reportData,
        cached.pdfBuffer,
      );

      if (result.success) {
        this.reportCacheService.set(
          deliveryCacheKey,
          result,
          DELIVERY_CACHE_TTL_MS,
        );
      }

      return result;
    });
  }

  private async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .leftJoinAndSelect('session.swipes', 'swipes')
      .leftJoinAndSelect('session.institution', 'institution')
      .leftJoinAndSelect('session.therapist', 'therapist')
      .leftJoinAndSelect('session.voucher', 'voucher')
      .where('session.id = :id', { id })
      // Garantizar el orden del motor psicométrico: los joins no garantizan orden en SQL.
      // percentage DESC → weighted_score DESC → category_id ASC
      .addOrderBy('results.percentage', 'DESC')
      .addOrderBy('results.weightedScore', 'DESC')
      .addOrderBy('results.categoryId', 'ASC');

    this.applySecurityBoundaries(query, scope);

    const session = await query.getOne();
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (
      scope?.role === UserRole.PATIENT &&
      session.paymentStatus !== SessionPaymentStatus.PAID &&
      session.paymentStatus !== SessionPaymentStatus.VOUCHER_REDEEMED
    ) {
      throw new BadRequestException(
        'Cannot generate report for a pending payment session',
      );
    }

    return session;
  }

  private applySecurityBoundaries(
    query: SelectQueryBuilder<Session>,
    scope?: SessionScope,
  ): void {
    if (!scope?.role) {
      query.andWhere('1 = 0');
      return;
    }

    const role = scope.role as UserRole;

    if (role === UserRole.ADMIN) {
      return;
    }
    if (role === UserRole.PATIENT) {
      return;
    }
    if (scope.institutionId) {
      query.andWhere('session.institutionId = :institutionId', {
        institutionId: scope.institutionId,
      });
      return;
    }
    if (scope.therapistUserId) {
      query.andWhere('session.therapistUserId = :therapistUserId', {
        therapistUserId: scope.therapistUserId,
      });
      return;
    }
    query.andWhere('1 = 0');
  }
}
