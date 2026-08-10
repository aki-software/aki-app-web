import {
  Injectable,
  Inject,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter.js';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentEvent } from '../entities/payment-event.entity.js';
import { PaymentFulfillmentOutbox } from '../entities/payment-fulfillment-outbox.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import { VoucherBatchStatus } from '../../vouchers/entities/voucher.enums.js';
import { VoucherFulfillmentDispatcherService } from './voucher-fulfillment-dispatcher.service.js';
import { toPaymentEvent } from './payment-safe-persistence.js';

export interface WebhookParams {
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  rawBody: Buffer;
  headers: Record<string, string | undefined>;
  body: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export type WebhookProcessResult = void | { outcome: 'PENDING_RETRY' };

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY_MP) private mpAdapter: PaymentGatewayAdapter,
    @Inject(PAYMENT_GATEWAY_STRIPE)
    private stripeAdapter: PaymentGatewayAdapter,
    @InjectDataSource() private dataSource: DataSource,
    @Optional()
    private readonly fulfillmentDispatcher?: VoucherFulfillmentDispatcherService,
  ) {}

  async processWebhook(
    params: WebhookParams,
    hasRetriedSerialization = false,
  ): Promise<WebhookProcessResult> {
    const adapter =
      params.gateway === 'MERCADO_PAGO' ? this.mpAdapter : this.stripeAdapter;
    if (!Buffer.isBuffer(params.rawBody))
      throw new BadRequestException('Webhook raw body is required');
    const isValid = await adapter.validateWebhook(params.rawBody, {
      headers: params.headers,
      query: params.query,
    });
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for ${params.gateway}`);
      throw new ForbiddenException('Invalid webhook signature');
    }

    const externalPaymentId =
      params.gateway === 'MERCADO_PAGO'
        ? await adapter.getAuthenticatedWebhookPaymentId?.(params.rawBody, {
            headers: params.headers,
            query: params.query,
          })
        : adapter.extractPaymentReference(params.body);

    if (!externalPaymentId) {
      this.logger.warn(
        `No external reference found in webhook payload for ${params.gateway}`,
      );
      throw new BadRequestException('Provider payment reference is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Idempotency check
      const existingEvent = await queryRunner.manager.findOne(PaymentEvent, {
        where: {
          externalPaymentId,
          gateway: params.gateway,
        },
      });

      if (existingEvent) {
        this.logger.debug(
          `Webhook already processed for payment ${externalPaymentId}`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      let paymentStatus;
      try {
        paymentStatus = await adapter.getPaymentStatus(externalPaymentId);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        if (isProviderUnavailable(error)) return { outcome: 'PENDING_RETRY' };
        throw error;
      }
      if (paymentStatus.status !== 'APPROVED') {
        await queryRunner.rollbackTransaction();
        return;
      }

      const voucherBatch = await queryRunner.manager.findOne(VoucherBatch, {
        where: { id: paymentStatus.merchantReference },
        relations: ['ownerInstitution', 'ownerUser'],
        lock: { mode: 'pessimistic_write', tables: ['voucher_batches'] },
      });

      if (!voucherBatch) {
        this.logger.warn(
          `VoucherBatch not found for payment ${externalPaymentId}`,
        );
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Unknown payment reference');
      }

      if (voucherBatch.status === VoucherBatchStatus.PAID) {
        const settledEvent = await queryRunner.manager.findOne(PaymentEvent, {
          where: { externalPaymentId, gateway: params.gateway },
        });
        if (settledEvent) {
          await queryRunner.rollbackTransaction();
          return;
        }
      }

      if (
        voucherBatch.status !== VoucherBatchStatus.PENDING ||
        !paymentStatus.merchantReference ||
        voucherBatch.id !== paymentStatus.merchantReference ||
        voucherBatch.expectedAmountMinor == null ||
        !voucherBatch.currency ||
        !paymentStatus.currency ||
        voucherBatch.expectedAmountMinor !==
          paymentStatus.amountMinor.toString() ||
        voucherBatch.currency.toUpperCase() !== paymentStatus.currency ||
        voucherBatch.paymentProvider !== params.gateway
      )
        throw new ForbiddenException(
          'Payment settlement does not match its expectation',
        );

      voucherBatch.markAsPaid();
      await queryRunner.manager.save(VoucherBatch, voucherBatch);

      const paymentEvent = queryRunner.manager.create(
        PaymentEvent,
        toPaymentEvent({
          gateway: params.gateway,
          externalPaymentId: paymentStatus.providerPaymentId,
          status: paymentStatus.status,
          voucherBatchId: voucherBatch.id,
          rawBody: params.rawBody,
        }) as PaymentEvent,
      );
      await queryRunner.manager.save(PaymentEvent, paymentEvent);
      const outbox = queryRunner.manager.create(PaymentFulfillmentOutbox, {
        voucherBatchId: voucherBatch.id,
      });
      await queryRunner.manager.save(PaymentFulfillmentOutbox, outbox);

      await queryRunner.commitTransaction();
      if (outbox.id) {
        void this.fulfillmentDispatcher
          ?.dispatchAfterCommit(outbox)
          .catch((error: unknown) => {
            this.logger.error(
              'Voucher fulfillment dispatch failed after settlement',
              error,
            );
          });
      }
      this.emitCompatibilityNotification(voucherBatch, params.gateway);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (!hasRetriedSerialization && isSerializationFailure(err)) {
        return this.processWebhook(params, true);
      }
      this.logger.error('Error processing webhook');
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  private emitCompatibilityNotification(
    voucherBatch: VoucherBatch,
    gateway: 'MERCADO_PAGO' | 'STRIPE',
  ): void {
    try {
      this.eventEmitter.emit('payment.completed', {
        voucherBatchId: voucherBatch.id,
        institutionId:
          voucherBatch.ownerInstitutionId ?? voucherBatch.ownerInstitution?.id,
        buyerEmail: voucherBatch.ownerUser?.email,
        planName: `Voucher batch (${voucherBatch.quantity})`,
        voucherQuantity: voucherBatch.quantity,
        gateway,
      });
    } catch (error) {
      this.logger.error(
        'Post-commit payment notification failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

function isProviderUnavailable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /timeout|timedout|unavailable|econnreset|ehostunreach/i.test(error.message)
  );
}

function isSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Error && /could not serialize access/i.test(error.message)
  );
}
