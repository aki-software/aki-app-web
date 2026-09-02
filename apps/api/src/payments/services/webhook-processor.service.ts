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
import { CheckoutAttempt } from '../entities/checkout-attempt.entity.js';
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

    let payment;
    try {
      payment = await adapter.getPaymentStatus(externalPaymentId);
    } catch (error) {
      if (isProviderUnavailable(error)) return { outcome: 'PENDING_RETRY' };
      throw error;
    }
    if (payment.status !== 'APPROVED') return;
    return this.settleVerifiedPayment({
      gateway: params.gateway,
      payment,
      rawBody: params.rawBody,
      hasRetriedSerialization,
    });
  }

  /** Shared authenticated settlement path for webhooks and server-side reconciliation. */
  async settleVerifiedPayment(params: {
    gateway: 'MERCADO_PAGO' | 'STRIPE';
    payment: import('../interfaces/payment-gateway.adapter.js').VerifiedPayment;
    rawBody: Buffer;
    hasRetriedSerialization?: boolean;
  }): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      const existingEvent = await queryRunner.manager.findOne(PaymentEvent, {
        where: {
          externalPaymentId: params.payment.providerPaymentId,
          gateway: params.gateway,
        },
      });
      if (existingEvent) {
        await queryRunner.rollbackTransaction();
        return;
      }
      const voucherBatch = await queryRunner.manager.findOne(VoucherBatch, {
        where: { id: params.payment.merchantReference },
        relations: ['ownerInstitution', 'ownerUser'],
        lock: { mode: 'pessimistic_write', tables: ['voucher_batches'] },
      });
      if (!voucherBatch)
        throw new BadRequestException('Unknown payment reference');
      if (
        voucherBatch.status !== VoucherBatchStatus.PENDING ||
        voucherBatch.id !== params.payment.merchantReference ||
        voucherBatch.expectedAmountMinor == null ||
        !voucherBatch.currency ||
        voucherBatch.expectedAmountMinor !==
          params.payment.amountMinor.toString() ||
        voucherBatch.currency.toUpperCase() !== params.payment.currency ||
        voucherBatch.paymentProvider !== params.gateway
      )
        throw new ForbiddenException(
          'Payment settlement does not match its expectation',
        );

      const checkoutAttempt = await queryRunner.manager.findOne(
        CheckoutAttempt,
        {
          where: { voucherBatchId: voucherBatch.id },
          relations: ['buyerUser'],
        },
      );
      voucherBatch.markAsPaid();
      await queryRunner.manager.save(VoucherBatch, voucherBatch);
      const paymentEvent = queryRunner.manager.create(
        PaymentEvent,
        toPaymentEvent({
          gateway: params.gateway,
          externalPaymentId: params.payment.providerPaymentId,
          status: params.payment.status,
          voucherBatchId: voucherBatch.id,
          rawBody: params.rawBody,
        }) as PaymentEvent,
      );
      paymentEvent.checkoutAttemptId = checkoutAttempt?.id ?? null;
      await queryRunner.manager.save(PaymentEvent, paymentEvent);
      const outbox = queryRunner.manager.create(PaymentFulfillmentOutbox, {
        voucherBatchId: voucherBatch.id,
      });
      await queryRunner.manager.save(PaymentFulfillmentOutbox, outbox);
      await queryRunner.commitTransaction();
      if (outbox.id)
        void this.fulfillmentDispatcher
          ?.dispatchAfterCommit(outbox)
          .catch((error: unknown) =>
            this.logger.error(
              'Voucher fulfillment dispatch failed after settlement',
              error,
            ),
          );
      this.emitCompatibilityNotification(
        voucherBatch,
        params.gateway,
        checkoutAttempt?.buyerUser?.email,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (!params.hasRetriedSerialization && isSerializationFailure(err)) {
        return this.settleVerifiedPayment({
          ...params,
          hasRetriedSerialization: true,
        });
      }
      this.logger.error('Error processing payment settlement');
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  private emitCompatibilityNotification(
    voucherBatch: VoucherBatch,
    gateway: 'MERCADO_PAGO' | 'STRIPE',
    buyerEmail?: string,
  ): void {
    try {
      this.eventEmitter.emit('payment.completed', {
        voucherBatchId: voucherBatch.id,
        institutionId:
          voucherBatch.ownerInstitutionId ?? voucherBatch.ownerInstitution?.id,
        buyerEmail,
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
