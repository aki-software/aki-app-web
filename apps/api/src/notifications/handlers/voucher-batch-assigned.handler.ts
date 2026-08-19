import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { VoucherBatchAssignedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class VoucherBatchAssignedHandler {
  private readonly logger = new Logger(VoucherBatchAssignedHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('voucher.batch.assigned')
  async handleVoucherBatchAssignedEvent(event: VoucherBatchAssignedEvent) {
    this.logger.log(
      `Handling voucher.batch.assigned event for ${event.targetEmail}, institution: ${event.institutionName}`,
    );
    try {
      const expiresAtFormatted = event.expiresAt
        ? new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(event.expiresAt)
        : null;

      const dashboardUrl =
        this.configService.get<string>('WEB_APP_URL') ||
        this.configService.get<string>('FRONTEND_URL') ||
        'https://app.akituespacio.com.ar';

      const html = this.templateRenderer.renderTemplate(
        'voucher-batch-assignment.pug',
        {
          institutionName: event.institutionName,
          quantity: event.quantity,
          expiresAt: expiresAtFormatted,
          dashboardUrl,
        },
      );

      await this.emailService.sendEmail(
        event.targetEmail,
        `${event.quantity} vouchers acreditados - Orient A.ki`,
        html,
      );
      this.logger.log(`Voucher batch email sent to ${event.targetEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send voucher batch email to ${event.targetEmail}`,
        error,
      );
    }
  }
}
