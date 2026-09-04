import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  PAYMENT_NOTIFICATION_DELIVERY_QUEUE,
  type PaymentNotificationDeliveryJobPayload,
} from './payment-notification-dispatcher.service.js';
import {
  PaymentNotificationDeliveryStateService,
  type ClaimedDelivery,
} from './payment-notification-delivery-state.service.js';

const MAX_ATTEMPTS = 8;
const RETRY_ERROR_MESSAGE = 'Payment notification delivery retry requested';
const TRANSIENT_MESSAGE = 'Email provider is temporarily unavailable';

export const PAYMENT_NOTIFICATION_DELIVERY_EXECUTOR = Symbol(
  'PAYMENT_NOTIFICATION_DELIVERY_EXECUTOR',
);

export type PaymentNotificationDeliveryExecutionOutcome =
  | { status: 'SENT' }
  | {
      status: 'RETRYABLE_FAILURE';
      classification: 'RENDER_FAILURE';
      message: 'Email content could not be rendered';
    }
  | {
      status: 'RETRYABLE_FAILURE';
      classification: 'TRANSPORT_TRANSIENT';
      message: typeof TRANSIENT_MESSAGE;
    }
  | {
      status: 'PERMANENT_FAILURE';
      classification: 'TRANSPORT_PERMANENT';
      message: 'Email provider rejected the recipient';
    };

export interface PaymentNotificationDeliveryExecutor {
  execute(
    delivery: ClaimedDelivery,
  ): Promise<PaymentNotificationDeliveryExecutionOutcome>;
}

@Processor(PAYMENT_NOTIFICATION_DELIVERY_QUEUE)
@Injectable()
export class PaymentNotificationProcessor extends WorkerHost {
  constructor(
    @Inject(PaymentNotificationDeliveryStateService)
    private readonly state: Pick<
      PaymentNotificationDeliveryStateService,
      'claim' | 'resolveRecipient' | 'markSent' | 'recordFailure'
    >,
    @Inject(PAYMENT_NOTIFICATION_DELIVERY_EXECUTOR)
    private readonly executor: PaymentNotificationDeliveryExecutor,
  ) {
    super();
  }

  async process(
    job: Pick<Job<PaymentNotificationDeliveryJobPayload>, 'data'>,
  ): Promise<void> {
    if (process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED !== 'true') return;
    const claimed = await this.state.claim(job.data.deliveryId);
    if (!claimed) return;

    const delivery = await this.state.resolveRecipient(
      claimed.id,
      claimed.attemptCount,
    );
    if (!delivery) return;

    let outcome: PaymentNotificationDeliveryExecutionOutcome;
    try {
      outcome = await this.executor.execute(delivery);
    } catch {
      outcome = {
        status: 'RETRYABLE_FAILURE',
        classification: 'TRANSPORT_TRANSIENT',
        message: TRANSIENT_MESSAGE,
      };
    }
    if (outcome.status === 'SENT') {
      await this.state.markSent(delivery.id, delivery.attemptCount);
      return;
    }
    if (outcome.status === 'PERMANENT_FAILURE') {
      await this.state.recordFailure(
        delivery.id,
        delivery.attemptCount,
        outcome.classification,
        outcome.message,
        true,
      );
    } else {
      await this.state.recordFailure(
        delivery.id,
        delivery.attemptCount,
        outcome.classification,
        outcome.message,
      );
    }
    if (
      outcome.status === 'RETRYABLE_FAILURE' &&
      delivery.attemptCount < MAX_ATTEMPTS
    ) {
      throw new Error(RETRY_ERROR_MESSAGE);
    }
  }
}
