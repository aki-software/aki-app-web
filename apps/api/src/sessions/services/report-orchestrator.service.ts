import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Session } from '../entities/session.entity';
import { ReportService } from './report.service';
import { MailService } from '../../mail/mail.service';
import { PdfService } from '../../common/services/pdf.service';
import { StorageService } from '../../common/services/storage.service';
import { SessionScope } from '../types/session-scope.type';

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
    scope?: SessionScope,
  ): Promise<{
    success: boolean;
    message: string;
    localReportPath?: string;
  }> {
    const session = await this.findOne(sessionId, scope);
    const reportData = await this.reportService.buildReportData(session);

    const htmlContent = this.mailService.renderReportPdfTemplate(
      reportData.patientName,
      reportData.topResults,
      reportData.hollandCode,
      undefined,
      reportData.summary,
      reportData.tripletInsight ?? undefined,
    );

    let pdfBuffer: Buffer | undefined;
    let reportUrl: string | null = null;
    let localReportPath: string | undefined;
    try {
      pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);

      localReportPath = await this.persistPdfLocally(sessionId, pdfBuffer);

      const fileName = `report_${sessionId}_${Date.now()}.pdf`;
      reportUrl = await this.storageService.uploadFile(pdfBuffer, fileName);

      if (reportUrl) {
        session.reportUrl = reportUrl;
        await this.sessionRepository.save(session);
      }
    } catch (err) {
      this.logger.warn(
        `sendReport pdf-fallback sessionId=${sessionId} paymentStatus=${session.paymentStatus ?? 'UNKNOWN'} voucherId=${session.voucherId ?? 'none'} reason=${(err as Error)?.message ?? 'unknown'}`,
      );
    }

    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      reportData.patientName,
      reportData.hollandCode,
      pdfBuffer,
      reportUrl ?? session.reportUrl ?? undefined,
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
      `sendReport dispatched sessionId=${sessionId} targetEmail=${targetEmail} mode=${pdfBuffer ? 'pdf' : 'html_fallback'} localReportPath=${localReportPath ?? 'none'}`,
    );

    return {
      success: true,
      message: `Email despachado hacia ${targetEmail}`,
      localReportPath,
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

  private async persistPdfLocally(
    sessionId: string,
    pdfBuffer: Buffer,
  ): Promise<string | undefined> {
    try {
      const configuredDir = process.env.REPORTS_LOCAL_DIR?.trim();
      const reportsDir = configuredDir
        ? resolve(configuredDir)
        : resolve(process.cwd(), 'tmp', 'reports');
      await mkdir(reportsDir, { recursive: true });

      const filePath = join(
        reportsDir,
        `report_${sessionId}_${Date.now()}.pdf`,
      );
      await writeFile(filePath, pdfBuffer);
      return filePath;
    } catch (error) {
      this.logger.warn(
        `persistPdfLocally failed sessionId=${sessionId} reason=${(error as Error)?.message ?? 'unknown'}`,
      );
      return undefined;
    }
  }
}
