import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ReportSummary,
  ReportTripletInsight,
} from '../common/types/report.types.js';
import {
  MailAdapter,
  MailMeta,
  MailPayload,
} from '../common/adapters/mail.adapter.js';
import { MAIL_TRANSPORT_TOKEN } from './transports/mail-transport.interface.js';
import type { MailTransport } from './transports/mail-transport.interface.js';
import { TemplateRendererService } from './services/template-renderer.service.js';

@Injectable()
export class MailService implements MailAdapter {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private configService: ConfigService,
    @Inject(MAIL_TRANSPORT_TOKEN) private mailTransport: MailTransport,
    private templateRenderer: TemplateRendererService,
  ) {}

  renderReportEmailTemplate(
    patientName: string,
    patientEmail?: string,
    hollandCode?: string,
    reportUrl?: string,
    summary?: ReportSummary,
  ): string {
    return this.templateRenderer.renderTemplate('report-email.pug', {
      patientName,
      patientEmail: patientEmail || null,
      hollandCode: hollandCode || null,
      reportUrl: reportUrl || null,
      summary: summary || null,
    });
  }

  async send(
    template: string,
    payload: MailPayload,
    meta: MailMeta,
  ): Promise<boolean> {
    try {
      const from = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@akit.app',
      );

      const htmlContent = this.templateRenderer.renderTemplate(
        template,
        payload,
      );

      await this.mailTransport.dispatchEmail({
        from: `Orient A.ki <${from}>`,
        to: meta.to,
        subject: meta.subject,
        html: htmlContent,
        text: meta.text,
        attachments: meta.attachments,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error in send method for template ${template} to ${meta.to}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
