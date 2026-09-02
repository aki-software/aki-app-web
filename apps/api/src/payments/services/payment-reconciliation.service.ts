import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CheckoutAttempt } from '../entities/checkout-attempt.entity.js';
import { VoucherBatchStatus } from '../../vouchers/entities/voucher.enums.js';
import { PAYMENT_GATEWAY_MP } from '../interfaces/payment-gateway.adapter.js';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { WebhookProcessorService } from './webhook-processor.service.js';

const RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECONCILIATION_ATTEMPT_LIMIT = 100;

/** Performs one bounded recovery pass for approved Mercado Pago payments missed by webhooks. */
@Injectable()
export class PaymentReconciliationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    @Inject(PAYMENT_GATEWAY_MP)
    private readonly mercadoPagoAdapter: PaymentGatewayAdapter,
    @InjectRepository(CheckoutAttempt)
    private readonly checkoutAttemptRepo: Repository<CheckoutAttempt>,
    private readonly webhookProcessor: WebhookProcessorService,
  ) {}

  onApplicationBootstrap(): void {
    void this.reconcileRecentAttempts().catch((error: unknown) => {
      this.logger.error(
        'Mercado Pago startup reconciliation failed',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  async reconcileRecentAttempts(): Promise<void> {
    const attempts = await this.checkoutAttemptRepo.find({
      where: {
        gateway: 'MERCADO_PAGO',
        state: In(['READY', 'OUTCOME_UNKNOWN']),
        createdAt: MoreThanOrEqual(
          new Date(Date.now() - RECONCILIATION_WINDOW_MS),
        ),
        voucherBatch: { status: VoucherBatchStatus.PENDING },
      },
      relations: ['voucherBatch'],
      order: { createdAt: 'DESC' },
      take: RECONCILIATION_ATTEMPT_LIMIT,
    });

    for (const attempt of attempts) {
      try {
        await this.reconcileAttempt(attempt);
      } catch (error) {
        this.logger.error(
          `Mercado Pago reconciliation failed for checkout attempt ${attempt.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async reconcileAttempt(attempt: CheckoutAttempt): Promise<void> {
    if (!attempt.voucherBatchId) return;

    const payment =
      await this.mercadoPagoAdapter.findPaymentByMerchantReference?.(
        attempt.voucherBatchId,
      );
    if (
      !payment ||
      payment.status !== 'APPROVED' ||
      payment.merchantReference !== attempt.voucherBatchId
    )
      return;

    await this.webhookProcessor.settleVerifiedPayment({
      gateway: 'MERCADO_PAGO',
      payment,
      rawBody: Buffer.from(
        JSON.stringify({
          source: 'mercado_pago_reconciliation',
          providerPaymentId: payment.providerPaymentId,
          merchantReference: payment.merchantReference,
        }),
        'utf8',
      ),
    });
  }
}
