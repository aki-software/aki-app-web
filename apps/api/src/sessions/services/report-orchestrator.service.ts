import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportService } from './report.service.js';
import { MailService } from '../../mail/mail.service.js';
import { PdfService } from '../../common/services/pdf.service.js';
import { StorageService } from '../../common/services/storage.service.js';
import { SessionScope } from '../types/session-scope.type.js';

@Injectable()
export class ReportOrchestratorService {
  private readonly logger = new Logger(ReportOrchestratorService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly reportService: ReportService,
    private readonly mailService: MailService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {}

  async sendReport(
    sessionId: string,
    targetEmail: string,
    voucherId?: string | null,
    scope?: SessionScope,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const session = await this.findOne(sessionId, scope);
    const voucherIdForLogging = voucherId ?? session.voucherId ?? undefined;
    const reportData = await this.reportService.buildReportData(
      session,
      targetEmail,
    );

    const htmlContent = this.reportService.renderReportPdfHtml(reportData);

    let pdfBuffer: Buffer | undefined;
    let reportUrl = session.reportUrl;

    try {
      // Si no hay URL, generamos el PDF y lo subimos
      if (!reportUrl) {
        pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);
        const fileName = `report_${sessionId}_${Date.now()}.pdf`;
        reportUrl = await this.storageService.uploadFile(pdfBuffer, fileName);
        
        if (reportUrl) {
          session.reportUrl = reportUrl;
          await this.sessionRepository.save(session);
        }
      } else {
        // Si ya hay URL, solo generamos el buffer para el adjunto si es necesario
        // Opcionalmente podríamos descargar el archivo desde StorageService
        pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);
      }
    } catch (err) {
      this.logger.warn(
        `sendReport pdf-generation-failed sessionId=${sessionId} reason=${(err as Error)?.message ?? 'unknown'}`,
      );
    }

    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      reportData.patientName,
      reportData.hollandCode,
      pdfBuffer,
      reportUrl ?? undefined,
      reportData.summary,
      reportData.tripletInsight ?? undefined,
    );

    if (!sent) {
      this.logger.error(
        `sendReport mail-dispatch-failed sessionId=${sessionId} targetEmail=${targetEmail}`,
      );
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    this.logger.log(
      `sendReport dispatched sessionId=${sessionId} voucherId=${voucherIdForLogging ?? 'none'} targetEmail=${targetEmail} mode=${pdfBuffer ? 'pdf' : 'html_fallback'}`,
    );

    return {
      success: true,
      message: `Email despachado hacia ${targetEmail}`,
    };
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
