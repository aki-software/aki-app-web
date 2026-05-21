import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { ReportService } from './report.service.js';
import { PdfService } from '../../common/services/pdf.service.js';
import { StorageService } from '../../common/services/storage.service.js';

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly reportService: ReportService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Generates a PDF for the session and uploads it to storage if not present.
   * Returns a buffer containing the PDF data, and the reportUrl (if generated/present).
   */
  async generateAndUploadPdf(
    session: Session,
    reportData: any,
  ): Promise<{ pdfBuffer?: Buffer; reportUrl?: string }> {
    const htmlContent = this.reportService.renderReportPdfHtml(reportData);

    let pdfBuffer: Buffer | undefined;
    let reportUrl = session.reportUrl;

    try {
      if (!reportUrl) {
        pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);
        const fileName = `report_${session.id}_${Date.now()}.pdf`;
        reportUrl = await this.storageService.uploadFile(pdfBuffer, fileName);

        if (reportUrl) {
          session.reportUrl = reportUrl;
          await this.sessionRepository.save(session);
        }
      } else {
        // Just generate the buffer for attachment
        pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);
      }
    } catch (err) {
      this.logger.warn(
        `PDF generation failed for sessionId=${session.id} reason=${(err as Error)?.message ?? 'unknown'}`,
      );
    }

    return { pdfBuffer, reportUrl: reportUrl ?? undefined };
  }
}
