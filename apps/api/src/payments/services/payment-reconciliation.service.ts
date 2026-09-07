import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
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
const DEFAULT_RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const RECONCILIATION_COOLDOWN_MS = 30 * 1000;

function reconciliationIntervalMs(): number {
  const configured = Number(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_RECONCILIATION_INTERVAL_MS;
}

/** Performs bounded recovery of approved Mercado Pago payments missed by webhooks. */
@Injectable()
export class PaymentReconciliationService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private reconciliationTimer?: NodeJS.Timeout;
  private activeScan?: Promise<void>;
  private readonly activeAttempts = new Map<string, Promise<void>>();
  private readonly lastAttemptAt = new Map<string, number>();

  constructor(
    @Inject(PAYMENT_GATEWAY_MP)
    private readonly mercadoPagoAdapter: PaymentGatewayAdapter,
    @InjectRepository(CheckoutAttempt)
    private readonly checkoutAttemptRepo: Repository<CheckoutAttempt>,
    private readonly webhookProcessor: WebhookProcessorService,
  ) {}

  onApplicationBootstrap(): void {
    this.runScheduledReconciliation('startup');
    this.reconciliationTimer = setInterval(() => {
      this.runScheduledReconciliation('periodic');
    }, reconciliationIntervalMs());
    this.reconciliationTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  reconcileRecentAttempts(): Promise<void> {
    if (this.activeScan) return this.activeScan;

    const scan = this.performRecentAttemptReconciliation().finally(() => {
      this.activeScan = undefined;
    });
    this.activeScan = scan;
    return scan;
  }

  reconcileAuthorizedAttempt(attempt: CheckoutAttempt): Promise<void> {
    if (!this.isEligibleAttempt(attempt)) return Promise.resolve();

    const active = this.activeAttempts.get(attempt.id);
    if (active) return active;

    const now = Date.now();
    const lastAttemptAt = this.lastAttemptAt.get(attempt.id);
    if (
      lastAttemptAt !== undefined &&
      now - lastAttemptAt < RECONCILIATION_COOLDOWN_MS
    ) {
      return Promise.resolve();
    }

    this.lastAttemptAt.set(attempt.id, now);
    const reconciliation = this.reconcileAttempt(attempt)
      .catch((error: unknown) => {
        this.logAttemptFailure(attempt.id, error);
      })
      .finally(() => {
        this.activeAttempts.delete(attempt.id);
      });
    this.activeAttempts.set(attempt.id, reconciliation);
    return reconciliation;
  }

  private runScheduledReconciliation(source: 'startup' | 'periodic'): void {
    void this.reconcileRecentAttempts().catch((error: unknown) => {
      this.logger.error(
        `Mercado Pago ${source} reconciliation failed`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private async performRecentAttemptReconciliation(): Promise<void> {
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
      await this.reconcileAuthorizedAttempt(attempt);
    }
  }

  private isEligibleAttempt(attempt: CheckoutAttempt): boolean {
    return (
      attempt.gateway === 'MERCADO_PAGO' &&
      (attempt.state === 'READY' || attempt.state === 'OUTCOME_UNKNOWN') &&
      !!attempt.voucherBatchId &&
      attempt.voucherBatch?.status === VoucherBatchStatus.PENDING &&
      attempt.createdAt.getTime() >= Date.now() - RECONCILIATION_WINDOW_MS
    );
  }

  private async reconcileAttempt(attempt: CheckoutAttempt): Promise<void> {
    const voucherBatchId = attempt.voucherBatchId;
    if (!voucherBatchId) return;

    const payment =
      await this.mercadoPagoAdapter.findPaymentByMerchantReference?.(
        voucherBatchId,
      );
    if (
      !payment ||
      payment.status !== 'APPROVED' ||
      payment.merchantReference !== voucherBatchId
    ) {
      return;
    }

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

  private logAttemptFailure(attemptId: string, error: unknown): void {
    this.logger.error(
      `Mercado Pago reconciliation failed for checkout attempt ${attemptId}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
