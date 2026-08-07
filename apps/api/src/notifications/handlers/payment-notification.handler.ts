import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TemplateRendererService } from '../services/template-renderer.service.js';
import { EmailService } from '../services/email.service.js';

@Injectable()
export class PaymentNotificationHandler {
  private readonly logger = new Logger(PaymentNotificationHandler.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: any) {
    try {
      const buyerHtml = this.templateRenderer.renderTemplate(
        'payment-confirmation-buyer.pug',
        payload,
      );
      await this.emailService.sendEmail(
        payload.buyerEmail,
        'Confirmación de compra - A.kit',
        buyerHtml,
      );

      // Delay for 1.5 seconds to avoid Mailtrap "Too many emails per second" limits
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const adminHtml = this.templateRenderer.renderTemplate(
        'payment-receipt-admin.pug',
        payload,
      );
      await this.emailService.sendEmail(
        'admin@test.com',
        'Nuevo cobro recibido',
        adminHtml,
      );
    } catch (error) {
      this.logger.error('Failed to send payment emails', error);
    }
  }
}
