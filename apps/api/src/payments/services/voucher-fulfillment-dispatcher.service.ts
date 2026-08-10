import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { JobsOptions } from 'bullmq';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { PaymentFulfillmentOutbox } from '../entities/payment-fulfillment-outbox.entity.js';

export const VOUCHER_FULFILLMENT_QUEUE = 'voucher-fulfillment';
export const VOUCHER_FULFILLMENT_JOB = 'voucher-fulfillment';
const RECOVERY_PAGE_SIZE = 100;

export interface VoucherFulfillmentJobPayload {
  outboxId: string;
}

export interface VoucherFulfillmentQueue {
  add(
    name: string,
    data: VoucherFulfillmentJobPayload,
    options?: JobsOptions,
  ): Promise<unknown>;
}

@Injectable()
export class VoucherFulfillmentDispatcherService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    VoucherFulfillmentDispatcherService.name,
  );
  private recoveryPromise: Promise<void> | undefined;

  constructor(
    @InjectQueue(VOUCHER_FULFILLMENT_QUEUE)
    private readonly queue: VoucherFulfillmentQueue,
    @InjectRepository(PaymentFulfillmentOutbox)
    private readonly outboxRepository?: Pick<
      Repository<PaymentFulfillmentOutbox>,
      'find'
    >,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.recoveryPromise) {
      this.recoveryPromise = this.recoverPending().catch((error: unknown) => {
        this.logger.error('Voucher fulfillment recovery enqueue failed', error);
      });
    }
    await this.recoveryPromise;
  }

  async dispatchAfterCommit(
    outbox: Pick<PaymentFulfillmentOutbox, 'id' | 'voucherBatchId'>,
  ): Promise<void> {
    await this.queue.add(
      VOUCHER_FULFILLMENT_JOB,
      { outboxId: outbox.id },
      {
        jobId: outbox.id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
      },
    );
  }

  async recoverPending(): Promise<void> {
    if (!this.outboxRepository) return;

    let lastOutboxId: string | undefined;
    for (;;) {
      const outboxes = await this.outboxRepository.find({
        where: lastOutboxId
          ? { processedAt: IsNull(), id: MoreThan(lastOutboxId) }
          : { processedAt: IsNull() },
        order: { id: 'ASC' },
        take: RECOVERY_PAGE_SIZE,
      });
      const pendingOutboxes = outboxes.filter((outbox) => !outbox.processedAt);
      for (const outbox of pendingOutboxes) {
        await this.dispatchAfterCommit(outbox);
      }
      if (outboxes.length < RECOVERY_PAGE_SIZE) return;
      lastOutboxId = outboxes[outboxes.length - 1].id;
    }
  }
}
