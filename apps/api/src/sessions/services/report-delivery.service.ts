import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service.js';

@Injectable()
export class ReportDeliveryService {
  private readonly logger = new Logger(ReportDeliveryService.name);

  constructor(private readonly mailService: MailService) {}

  /**
   * Sends the vocational report email to the target.
   * Returns a success boolean and a status message.
   */
  async deliverReport(
    targetEmail: string,
    sessionId: string,
    voucherIdForLogging: string | undefined,
    reportData: any,
    pdfBuffer?: Buffer,
    reportUrl?: string,
  ): Promise<{ success: boolean; message: string }> {
    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      reportData.patientName,
      reportData.hollandCode,
      pdfBuffer,
      reportUrl,
      reportData.summary,
      reportData.tripletInsight ?? undefined,
    );

    if (!sent) {
      this.logger.error(
        `Email dispatch failed for sessionId=${sessionId} targetEmail=${targetEmail}`,
      );
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    this.logger.log(
      `Email dispatched for sessionId=${sessionId} voucherId=${voucherIdForLogging ?? 'none'} targetEmail=${targetEmail} mode=${pdfBuffer ? 'pdf' : 'html_fallback'}`,
    );

    return {
      success: true,
      message: `Email despachado hacia ${targetEmail}`,
    };
  }
}
