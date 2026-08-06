import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentNotificationHandler {
  private readonly logger = new Logger(PaymentNotificationHandler.name);

  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: any) {
    try {
      await this.emailQueue.add('send_email', {
        template: 'payment-confirmation-buyer',
        to: payload.buyerEmail,
        ...payload,
      });
      await this.emailQueue.add('send_email', {
        template: 'payment-receipt-admin',
        to: 'admin@test.com',
        ...payload,
      });
    } catch (error) {
      this.logger.error('Failed to queue email', error);
    }
  }
}
