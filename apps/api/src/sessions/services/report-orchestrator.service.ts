import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportService } from './report.service.js';
import { ReportCacheService } from './report-cache.service.js';
import { ReportGeneratorService } from './report-generator.service.js';
import { ReportDeliveryService } from './report-delivery.service.js';
import { SessionScope } from '../types/session-scope.type.js';
import type { ReportData } from '../../common/types/report.types.js';

@Injectable()
export class ReportOrchestratorService {
  private readonly logger = new Logger(ReportOrchestratorService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly reportService: ReportService,
    private readonly reportCacheService: ReportCacheService,
    private readonly reportGeneratorService: ReportGeneratorService,
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
      reportUrl?: string;
    } = await this.reportCacheService.getOrCreate(cacheKey, async () => {
      this.logger.debug(`Generating report for session: ${sessionId}`);

      const reportData = await this.reportService.buildReportData(
        session,
        targetEmail,
      );

      const { pdfBuffer, reportUrl } =
        await this.reportGeneratorService.generateAndUploadPdf(
          session,
          reportData,
        );

      return { reportData, pdfBuffer, reportUrl };
    });

    this.logger.debug(`Sending report for session: ${sessionId}`);

    const deliveryCacheKey = `delivery:${sessionId}:${targetEmail}`;
    const deliveryLockKey = `lock:${deliveryCacheKey}`;

    // Fast-path: delivery already completed successfully (e.g. second request hits after first finishes)
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

    // Slow-path: acquire lock so concurrent requests don't double-send
    return await this.reportCacheService.withLock(deliveryLockKey, async () => {
      // Re-check inside lock (another request may have finished while we waited)
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
        cached.reportUrl,
      );

      // Only cache on success — failed deliveries should remain retryable
      if (result.success) {
        this.reportCacheService.set(deliveryCacheKey, result, 10 * 60 * 1000);
      }

      return result;
    });
  }

  private async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const normalizedRole = scope?.role?.toUpperCase();
    let where: any = {};

    if (normalizedRole !== 'ADMIN') {
      const scopedWhere =
        normalizedRole === 'PATIENT' && scope?.patientId
          ? { patientId: scope.patientId }
          : scope?.therapistUserId
            ? { therapistUserId: scope.therapistUserId }
            : scope?.institutionId
              ? { institutionId: scope.institutionId }
              : { id: '__forbidden__' };
      where = scopedWhere;
    }

    if (id) {
      where = { ...where, id };
    }

    const session = await this.sessionRepository.findOne({
      where,
      relations: ['results', 'swipes', 'institution', 'therapist', 'voucher'],
    });

    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }
}
