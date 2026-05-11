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
  private readonly reportCache = new Map<string, ReportCacheEntry>();
  private readonly reportLocks = new Map<string, Promise<ReportCacheEntry>>();
  private readonly reportCacheTtlMs = 10 * 60_000;

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
    localReportPath?: string;
  }> {
    const session = await this.findOne(sessionId, scope);
    const voucherIdForLogging = voucherId ?? session.voucherId ?? undefined;
    const reportData = await this.reportService.buildReportData(session, targetEmail);

    const htmlContent = this.mailService.renderReportPdfTemplate(
      reportData.patientName,
      reportData.topResults,
      reportData.hollandCode,
      undefined,
      reportData.summary,
      reportData.tripletInsight ?? undefined,
      reportData.patientEmail,
      reportData.hollandPercentages,
      reportData.strengths,
    );

    let pdfBuffer: Buffer | undefined;
    let reportUrl: string | null = null;
    let localReportPath: string | undefined;
    try {
      const cachedReport = this.getCachedReport(sessionId);
      if (cachedReport) {
        pdfBuffer = cachedReport.pdfBuffer;
        reportUrl = cachedReport.reportUrl ?? null;
        localReportPath = cachedReport.localReportPath;
      } else if (session.reportUrl) {
        reportUrl = session.reportUrl;
        this.setCachedReport(sessionId, { reportUrl });
      } else {
        const generatedReport = await this.generateReportWithLock(
          session,
          htmlContent,
        );
        pdfBuffer = generatedReport.pdfBuffer;
        reportUrl = generatedReport.reportUrl ?? null;
        localReportPath = generatedReport.localReportPath;
      }
    } catch (err) {
      this.logger.warn(
        `sendReport pdf-fallback sessionId=${sessionId} paymentStatus=${session.paymentStatus ?? 'UNKNOWN'} voucherId=${voucherIdForLogging ?? 'none'} reason=${(err as Error)?.message ?? 'unknown'}`,
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
      `sendReport dispatched sessionId=${sessionId} voucherId=${voucherIdForLogging ?? 'none'} targetEmail=${targetEmail} mode=${pdfBuffer ? 'pdf' : 'html_fallback'} localReportPath=${localReportPath ?? 'none'}`,
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

  private getCachedReport(sessionId: string): ReportCacheEntry | undefined {
    const cached = this.reportCache.get(sessionId);
    if (!cached) {
      return undefined;
    }

    if (Date.now() - cached.cachedAt > this.reportCacheTtlMs) {
      this.reportCache.delete(sessionId);
      return undefined;
    }

    return cached;
  }

  private setCachedReport(
    sessionId: string,
    entry: Omit<ReportCacheEntry, 'cachedAt'>,
  ): void {
    this.reportCache.set(sessionId, { ...entry, cachedAt: Date.now() });
  }

  private async generateReportWithLock(
    session: Session,
    htmlContent: string,
  ): Promise<ReportCacheEntry> {
    const sessionId = session.id;
    const existingLock = this.reportLocks.get(sessionId);
    if (existingLock) {
      return await existingLock;
    }

    const generationPromise = (async (): Promise<ReportCacheEntry> => {
      const pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);
      const localReportPath = await this.persistPdfLocally(sessionId, pdfBuffer);

      let reportUrl = session.reportUrl ?? null;
      if (!reportUrl) {
        const fileName = `report_${sessionId}_${Date.now()}.pdf`;
        reportUrl = await this.storageService.uploadFile(pdfBuffer, fileName);
        if (reportUrl) {
          session.reportUrl = reportUrl;
          await this.sessionRepository.save(session);
        }
      }

      const entry = {
        pdfBuffer,
        reportUrl,
        localReportPath,
        cachedAt: Date.now(),
      };
      this.reportCache.set(sessionId, entry);
      return entry;
    })();

    this.reportLocks.set(sessionId, generationPromise);

    try {
      return await generationPromise;
    } finally {
      this.reportLocks.delete(sessionId);
    }
  }
}

type ReportCacheEntry = {
  pdfBuffer?: Buffer;
  reportUrl?: string | null;
  localReportPath?: string;
  cachedAt: number;
};
