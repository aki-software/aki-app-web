import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UserRegisteredEvent,
  PaymentVerifiedEvent,
  ReportFailedEvent,
} from '../events/domain-events.js';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  @OnEvent('user.registered')
  handleUserRegisteredEvent(event: UserRegisteredEvent) {
    this.logger.log(`Handling user.registered event for ${event.email}`);
  }

  @OnEvent('payment.verified')
  handlePaymentVerifiedEvent(event: PaymentVerifiedEvent) {
    this.logger.log(`Handling payment.verified event for ${event.userEmail}`);
  }

  @OnEvent('report.failed')
  handleReportFailedEvent(event: ReportFailedEvent) {
    this.logger.error(
      `Handling report.failed event for job ${event.jobId}: ${event.errorReason}`,
    );
  }
}
