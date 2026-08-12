import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportGeneratedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class ReportGeneratedHandler {
  private readonly logger = new Logger(ReportGeneratedHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('report.generated')
  async handleReportGeneratedEvent(event: ReportGeneratedEvent) {
    this.logger.log(
      `Handling report.generated event for ${event.requestedByEmail}, url: ${event.reportUrl}`,
    );
    try {
      const html = this.templateRenderer.renderTemplate('report-email.pug', {
        patientName: null,
        patientEmail: event.requestedByEmail,
        reportUrl: event.reportUrl,
        summary: event.summary,
      });

      const attachments = event.pdfBuffer
        ? [
            {
              filename: 'Informe_Vocacional.pdf',
              content: event.pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined;
      await this.emailService.sendEmail(
        event.requestedByEmail,
        'Tu informe vocacional está listo - Orient A.ki',
        html,
        attachments,
      );
      this.logger.log(`Report email sent to ${event.requestedByEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send report email to ${event.requestedByEmail}`,
        error,
      );
    }
  }
}
