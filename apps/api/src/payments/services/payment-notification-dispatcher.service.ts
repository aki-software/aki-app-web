import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { JobsOptions } from 'bullmq';
import { DataSource, type EntityManager } from 'typeorm';
import { PaymentNotificationDelivery } from '../entities/payment-notification-delivery.entity.js';

export const PAYMENT_NOTIFICATION_DELIVERY_QUEUE =
  'payment-notification-delivery';
export const PAYMENT_NOTIFICATION_DELIVERY_JOB =
  'payment-notification-delivery';
export const PAYMENT_NOTIFICATION_DISPATCHER = Symbol(
  'PAYMENT_NOTIFICATION_DISPATCHER',
);
const MAX_ENQUEUE_ATTEMPTS = 8;
const QUEUE_RETRY_DELAY_MS = 60_000;
const QUEUE_FAILURE_MESSAGE = 'Delivery could not be queued';
const TERMINAL_STATUSES = ['SENT', 'DEAD_LETTER'];

export interface PaymentNotificationDeliveryJobPayload {
  deliveryId: string;
}

export interface PaymentNotificationDeliveryQueue {
  getJob(jobId: string): Promise<unknown>;
  add(
    name: string,
    data: PaymentNotificationDeliveryJobPayload,
    options: JobsOptions,
  ): Promise<unknown>;
}

export interface PaymentNotificationDispatcher {
  dispatchAfterCommit(deliveryId: string): Promise<void>;
}

@Injectable()
export class PaymentNotificationDispatcherService implements PaymentNotificationDispatcher {
  constructor(
    @InjectQueue(PAYMENT_NOTIFICATION_DELIVERY_QUEUE)
    private readonly queue: PaymentNotificationDeliveryQueue,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async dispatchAfterCommit(deliveryId: string): Promise<void> {
    if (process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED !== 'true') return;
    if (await this.queue.getJob(deliveryId)) return;

    const enqueueAttemptCount = await this.reserveEnqueueAttempt(deliveryId);
    if (!enqueueAttemptCount) return;

    try {
      await this.queue.add(
        PAYMENT_NOTIFICATION_DELIVERY_JOB,
        { deliveryId },
        {
          jobId: deliveryId,
          attempts: MAX_ENQUEUE_ATTEMPTS,
          backoff: { type: 'exponential', delay: QUEUE_RETRY_DELAY_MS },
        },
      );
    } catch {
      await this.recordQueueFailure(deliveryId, enqueueAttemptCount);
      throw new Error(QUEUE_FAILURE_MESSAGE);
    }
    await this.recordQueueSuccess(deliveryId);
  }

  private async reserveEnqueueAttempt(
    deliveryId: string,
  ): Promise<number | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const delivery = await manager.findOne(PaymentNotificationDelivery, {
        where: { id: deliveryId },
        lock: {
          mode: 'pessimistic_write',
          tables: ['payment_notification_deliveries'],
        },
      });
      if (
        !delivery ||
        delivery.status === 'SENT' ||
        delivery.status === 'DEAD_LETTER' ||
        delivery.enqueueAttemptCount >= MAX_ENQUEUE_ATTEMPTS
      ) {
        return undefined;
      }

      delivery.enqueueAttemptCount += 1;
      await manager.save(PaymentNotificationDelivery, delivery);
      return delivery.enqueueAttemptCount;
    });
  }

  private async recordQueueSuccess(deliveryId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.conditionalUpdate(manager, deliveryId, {
        status: 'QUEUED',
        queuedAt: new Date(),
        nextAttemptAt: null,
        lastErrorClassification: null,
        lastErrorMessage: null,
      });
    });
  }

  private async recordQueueFailure(
    deliveryId: string,
    enqueueAttemptCount: number,
  ): Promise<void> {
    const deadLetter = enqueueAttemptCount >= MAX_ENQUEUE_ATTEMPTS;
    await this.dataSource.transaction(async (manager) => {
      await this.conditionalUpdate(manager, deliveryId, {
        status: deadLetter ? 'DEAD_LETTER' : 'RETRYABLE_FAILED',
        lastErrorClassification: 'QUEUE_FAILURE',
        lastErrorMessage: QUEUE_FAILURE_MESSAGE,
        nextAttemptAt: deadLetter
          ? null
          : new Date(
              Date.now() +
                QUEUE_RETRY_DELAY_MS * 2 ** (enqueueAttemptCount - 1),
            ),
      });
    });
  }

  private async conditionalUpdate(
    manager: EntityManager,
    deliveryId: string,
    update: Partial<PaymentNotificationDelivery>,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(PaymentNotificationDelivery)
      .set(update)
      .where('id = :deliveryId', { deliveryId })
      .andWhere('status NOT IN (:...terminalStatuses)', {
        terminalStatuses: TERMINAL_STATUSES,
      })
      .execute();
  }
}
