import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter.js';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaymentEvent } from '../entities/payment-event.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';

interface WebhookParams {
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  rawBody: string;
  headers: Record<string, string>;
  body: any;
}

/**
 * Idempotent Webhook Processor for Payment Gateways.
 * 
 * Responsibilities:
 * 1. Validates the cryptographic signature of incoming webhooks.
 * 2. Parses the external payment reference from the payload.
 * 3. Executes a strict SERIALIZABLE database transaction to ensure idempotency.
 *    - It checks if a `PaymentEvent` already exists for this reference.
 * 4. If new, it updates the `VoucherBatch` status to 'PAID' and saves the `PaymentEvent`.
 * 5. Emits the `payment.completed` domain event to trigger emails and downstream logic.
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY_MP) private mpAdapter: PaymentGatewayAdapter,
    @Inject(PAYMENT_GATEWAY_STRIPE)
    private stripeAdapter: PaymentGatewayAdapter,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async processWebhook(params: WebhookParams) {
    const adapter =
      params.gateway === 'MERCADO_PAGO' ? this.mpAdapter : this.stripeAdapter;
    const isValid = await adapter.validateWebhook(
      params.rawBody,
      params.headers,
    );
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for ${params.gateway}`);
      throw new ForbiddenException('Invalid webhook signature');
    }

    let externalReference: string | undefined;

    if (params.gateway === 'MERCADO_PAGO') {
      if (params.body?.type === 'payment') {
        const paymentId = params.body?.data?.id;
        if (!paymentId) return;
        externalReference = paymentId.toString();
      } else {
        return;
      }
    } else {
      if (params.body?.type === 'checkout.session.completed') {
        externalReference = params.body?.data?.object?.id;
        if (!externalReference) return;
      } else {
        return;
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Idempotency check
      const existingEvent = await queryRunner.manager.findOne(PaymentEvent, {
        where: {
          externalPaymentId: externalReference,
          gateway: params.gateway,
        },
      });

      if (existingEvent) {
        this.logger.debug(
          `Webhook already processed for payment ${externalReference}`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      const paymentStatus = await adapter.getPaymentStatus(externalReference);
      if (paymentStatus.status !== 'APPROVED') {
        await queryRunner.rollbackTransaction();
        return;
      }

      const voucherBatch = await queryRunner.manager.findOne(VoucherBatch, {
        where: { paymentReference: externalReference },
        relations: ['institution'],
      });

      if (!voucherBatch) {
        this.logger.warn(
          `VoucherBatch not found for payment ${externalReference}`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      if (voucherBatch.status === 'PENDING') {
        voucherBatch.markAsPaid(params.gateway, externalReference);
        await queryRunner.manager.save(VoucherBatch, voucherBatch);
      }

      const paymentEvent = queryRunner.manager.create(PaymentEvent, {
        gateway: params.gateway,
        externalPaymentId: externalReference,
        status: paymentStatus.status,
        rawPayload: params.body,
        voucherBatchId: voucherBatch.id,
      });
      await queryRunner.manager.save(PaymentEvent, paymentEvent);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('payment.completed', {
        voucherBatchId: voucherBatch.id,
        institutionId: voucherBatch.institution.id,
        buyerEmail: 'admin@institution.com', // Would ideally come from metadata or batch
        planName: `Lote de ${voucherBatch.totalPrice}`, // Mocked
        voucherQuantity: 0, // Mocked
        gateway: params.gateway,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error processing webhook', (err as Error).stack || err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
