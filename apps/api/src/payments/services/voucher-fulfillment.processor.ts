import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import {
  createAvailableVoucher,
  Voucher,
} from '../../vouchers/entities/voucher.entity.js';
import { VoucherBatchStatus } from '../../vouchers/entities/voucher.enums.js';
import { VoucherCodeGenerator } from '../../vouchers/services/voucher-code-generator.service.js';
import { PaymentFulfillmentOutbox } from '../entities/payment-fulfillment-outbox.entity.js';
import { PaymentNotificationIntentService } from './payment-notification-intent.service.js';
import {
  VOUCHER_FULFILLMENT_QUEUE,
  type VoucherFulfillmentJobPayload,
} from './voucher-fulfillment-dispatcher.service.js';

@Processor(VOUCHER_FULFILLMENT_QUEUE)
@Injectable()
export class VoucherFulfillmentProcessor extends WorkerHost {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(VoucherCodeGenerator)
    private readonly codeGenerator: Pick<
      VoucherCodeGenerator,
      'generateUniqueCode'
    >,
    @Inject(PaymentNotificationIntentService)
    private readonly paymentNotificationIntents: Pick<
      PaymentNotificationIntentService,
      'createForFirstFulfillment'
    >,
  ) {
    super();
  }

  async process(
    job: Pick<Job<VoucherFulfillmentJobPayload>, 'data'>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let batch: VoucherBatch | null | undefined;
    let outbox: PaymentFulfillmentOutbox | null | undefined;
    try {
      outbox = await queryRunner.manager.findOne(PaymentFulfillmentOutbox, {
        where: { id: job.data.outboxId },
        lock: {
          mode: 'pessimistic_write',
          tables: ['payment_fulfillment_outbox'],
        },
      });
      if (!outbox || outbox.processedAt) {
        await queryRunner.rollbackTransaction();
        return;
      }

      batch = await queryRunner.manager.findOne(VoucherBatch, {
        where: { id: outbox.voucherBatchId },
        lock: { mode: 'pessimistic_write', tables: ['voucher_batches'] },
      });
      if (!batch || batch.status !== VoucherBatchStatus.PAID) {
        throw new Error('Voucher fulfillment requires a paid batch');
      }
      if (batch.fulfilledAt) {
        outbox.processedAt = new Date();
        await queryRunner.manager.save(PaymentFulfillmentOutbox, outbox);
        await queryRunner.commitTransaction();
        return;
      }

      const existingVoucherCount = await queryRunner.manager.count(Voucher, {
        where: { batchId: batch.id },
      });
      if (existingVoucherCount > batch.quantity) {
        throw new Error('Voucher batch is over-fulfilled');
      }

      const vouchers: Voucher[] = [];
      for (let index = existingVoucherCount; index < batch.quantity; index++) {
        vouchers.push(
          queryRunner.manager.create(
            Voucher,
            createAvailableVoucher({
              batchId: batch.id,
              code: await this.codeGenerator.generateUniqueCode(),
              ownerType: batch.ownerType,
              ownerInstitutionId: batch.ownerInstitutionId,
              ownerUserId: batch.ownerUserId,
              assignedPatientName: null,
              assignedPatientEmail: null,
              expiresAt: null,
            }),
          ),
        );
      }

      if (vouchers.length > 0) {
        await queryRunner.manager.save(Voucher, vouchers);
      }
      const fulfilledAt = new Date();
      await this.paymentNotificationIntents.createForFirstFulfillment(
        queryRunner.manager,
        batch,
        fulfilledAt,
      );
      batch.fulfilledAt = fulfilledAt;
      outbox.processedAt = fulfilledAt;
      await queryRunner.manager.save(VoucherBatch, batch);
      await queryRunner.manager.save(PaymentFulfillmentOutbox, outbox);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (batch) batch.fulfilledAt = null;
      if (outbox) outbox.processedAt = null;
      throw error;
    } finally {
      if (!queryRunner.isReleased) await queryRunner.release();
    }
  }

  async handleCompatibilityPaymentCompleted(): Promise<void> {
    // Voucher fulfillment is authorized exclusively by the durable outbox job.
  }
}
