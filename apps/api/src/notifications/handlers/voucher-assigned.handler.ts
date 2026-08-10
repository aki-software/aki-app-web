import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VoucherAssignedEvent } from '../../events/domain-events.js';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class VoucherAssignedHandler {
  private readonly logger = new Logger(VoucherAssignedHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('voucher.assigned')
  async handleVoucherAssignedEvent(event: VoucherAssignedEvent) {
    this.logger.log(
      `Handling voucher.assigned event for ${event.targetEmail}, code: ${event.voucherCode}`,
    );
    try {
      const html = this.templateRenderer.renderTemplate('voucher-code.pug', {
        patientName: event.patientName,
        voucherCode: event.voucherCode,
        institutionName: null,
      });
      await this.emailService.sendEmail(
        event.targetEmail,
        'Tu código de acceso - Orient A.ki',
        html,
      );
      this.logger.log(`Voucher email sent to ${event.targetEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send voucher email to ${event.targetEmail}`,
        error,
      );
    }
  }
}
