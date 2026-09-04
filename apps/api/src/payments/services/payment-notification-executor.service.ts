import { Injectable } from '@nestjs/common';
import { EmailService } from '../../notifications/services/email.service.js';
import { TemplateRendererService } from '../../notifications/services/template-renderer.service.js';
import type { ClaimedDelivery } from './payment-notification-delivery-state.service.js';
import type {
  PaymentNotificationDeliveryExecutionOutcome,
  PaymentNotificationDeliveryExecutor,
} from './payment-notification-processor.service.js';
import { mapPaymentNotificationRender } from './payment-notification-renderer.js';

const RENDER_FAILURE: PaymentNotificationDeliveryExecutionOutcome = {
  status: 'RETRYABLE_FAILURE',
  classification: 'RENDER_FAILURE',
  message: 'Email content could not be rendered',
};

const INVALID_RECIPIENT: PaymentNotificationDeliveryExecutionOutcome = {
  status: 'PERMANENT_FAILURE',
  classification: 'TRANSPORT_PERMANENT',
  message: 'Email provider rejected the recipient',
};

const TRANSPORT_FAILURE: PaymentNotificationDeliveryExecutionOutcome = {
  status: 'RETRYABLE_FAILURE',
  classification: 'TRANSPORT_TRANSIENT',
  message: 'Email provider is temporarily unavailable',
};

@Injectable()
export class PaymentNotificationExecutor implements PaymentNotificationDeliveryExecutor {
  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly emailService: EmailService,
  ) {}

  async execute(
    delivery: ClaimedDelivery,
  ): Promise<PaymentNotificationDeliveryExecutionOutcome> {
    if (!isValidEmail(delivery.recipientEmailSnapshot)) {
      return INVALID_RECIPIENT;
    }

    let render: ReturnType<typeof mapPaymentNotificationRender>;
    let html: string;
    try {
      render = mapPaymentNotificationRender(delivery);
      html = this.templateRenderer.renderTemplate(
        render.template,
        render.model,
      );
    } catch {
      return RENDER_FAILURE;
    }

    try {
      await this.emailService.sendEmail(
        delivery.recipientEmailSnapshot,
        render.subject,
        html,
      );
      return { status: 'SENT' };
    } catch {
      return TRANSPORT_FAILURE;
    }
  }
}

function isValidEmail(value: string | null): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
