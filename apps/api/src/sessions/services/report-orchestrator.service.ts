import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportService } from './report.service.js';
import { ReportCacheService } from './report-cache.service.js';
import { ReportGeneratorService } from './report-generator.service.js';
import { ReportDeliveryService } from './report-delivery.service.js';
import { SessionScope } from '../types/session-scope.type.js';
import type { ReportData } from '../../common/types/report.types.js';
import { SessionPaymentStatus } from '@akit/contracts';

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
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .leftJoinAndSelect('session.swipes', 'swipes')
      .leftJoinAndSelect('session.institution', 'institution')
      .leftJoinAndSelect('session.therapist', 'therapist')
      .leftJoinAndSelect('session.voucher', 'voucher')
      .where('session.id = :id', { id });

    this.applySecurityBoundaries(query, scope);

    const session = await query.getOne();
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Validar monetización explícitamente para pacientes (los admin/instituciones no están sujetos a esta validación si llegan aquí)
    if (scope?.role === 'PATIENT') {
      if (
        session.paymentStatus !== SessionPaymentStatus.PAID &&
        session.paymentStatus !== SessionPaymentStatus.VOUCHER_REDEEMED
      ) {
        throw new BadRequestException(
          'Cannot generate report for a pending payment session',
        );
      }
    }

    return session;
  }

  /**
   * Aplica barreras de seguridad declarativas por rol, usando early returns.
   * Cualquier flujo no mapeado o no autenticado resulta en bloqueo absoluto (1 = 0).
   */
  private applySecurityBoundaries(
    query: SelectQueryBuilder<Session>,
    scope?: SessionScope,
  ): void {
    if (!scope?.role) {
      query.andWhere('1 = 0');
      return;
    }

    const role = scope.role.toUpperCase();

    // Administradores: acceso total, sin restricciones adicionales
    if (role === 'ADMIN') {
      return;
    }

    // Pacientes: el UUIDv4 actúa como capability token.
    // Conocer el ID de la sesión es suficiente autorización para generar/enviar el reporte.
    if (role === 'PATIENT') {
      return;
    }

    // Instituciones: sesiones que pertenezcan a su institución
    if (scope.institutionId) {
      query.andWhere('session.institutionId = :institutionId', {
        institutionId: scope.institutionId,
      });
      return;
    }

    // Terapeutas: sesiones que hayan sido creadas por ellos
    if (scope.therapistUserId) {
      query.andWhere('session.therapistUserId = :therapistUserId', {
        therapistUserId: scope.therapistUserId,
      });
      return;
    }

    // Fallback de seguridad absoluto para cualquier caso no contemplado
    query.andWhere('1 = 0');
  }
}
