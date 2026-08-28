import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
  type CheckoutRequest,
  type PaymentGatewayAdapter,
} from '../interfaces/payment-gateway.adapter.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity.js';
import {
  CheckoutAttempt,
  type CompleteCommercialSnapshot,
} from '../entities/checkout-attempt.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import {
  VoucherOwnerType,
  VoucherBatchStatus,
} from '../../vouchers/entities/voucher.enums.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { ExchangeRateService } from './exchange-rate.service.js';
import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
  multiplyAndRoundHalfUp,
} from '../utils/checkout-money.js';
import {
  createClientKeyDigest,
  createProviderIdempotencyKey,
  createRequestFingerprint,
} from '../utils/checkout-idempotency.js';

interface InitiateCheckoutParams {
  planId: string;
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  institutionId: string;
  userId?: string;
  buyerEmail: string;
  checkoutAttemptId?: string;
  successUrl?: string;
  failureUrl?: string;
  idempotencyKey?: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PAYMENT_GATEWAY_MP) private mpAdapter: PaymentGatewayAdapter,
    @Inject(PAYMENT_GATEWAY_STRIPE)
    private stripeAdapter: PaymentGatewayAdapter,
    @InjectRepository(PricingPlan)
    private pricingPlanRepo: Repository<PricingPlan>,
    private exchangeRateService: ExchangeRateService,
    @InjectRepository(CheckoutAttempt)
    private checkoutAttemptRepo: Repository<CheckoutAttempt>,
  ) {}

  async initiateCheckout(params: InitiateCheckoutParams) {
    const clientKey = this.requireIdempotencyKey(params.idempotencyKey);
    const userId = this.requireBuyer(params.userId);
    const secret = this.requireIdempotencySecret();
    const plan = await this.pricingPlanRepo.findOneBy({
      id: params.planId,
      isActive: true,
    });
    if (!plan)
      throw new NotFoundException('Pricing plan not found or inactive');
    const urls = this.resolveCheckoutUrls(params.gateway);
    const snapshot = await this.createSnapshot(plan, params.gateway);
    const fingerprint = createRequestFingerprint({
      planId: plan.id,
      gateway: params.gateway,
      snapshot,
      successUrl: params.successUrl ?? null,
      failureUrl: params.failureUrl ?? null,
    });
    const digest = createClientKeyDigest(clientKey, secret);
    const existing = await this.findExisting(params, userId, digest);
    if (existing) {
      if (params.gateway === 'MERCADO_PAGO') {
        return this.resumeMercadoPago(
          existing,
          fingerprint,
          digest,
          params,
          urls,
          plan,
        );
      }
      return this.resumeExisting(existing, fingerprint, digest);
    }
    if (params.checkoutAttemptId) {
      throw new NotFoundException('Checkout attempt not found');
    }

    const batchId = randomUUID();
    const attemptId = randomUUID();
    const providerIdempotencyKey = createProviderIdempotencyKey(
      params.gateway,
      attemptId,
      secret,
    );
    const charged = snapshot.charged;
    const chargedAmount = minorUnitsToDecimal(BigInt(charged.amountMinor), 2);
    const batch = await this.checkoutAttemptRepo.manager.transaction(
      async (manager) => {
        const voucherBatch = manager.create(VoucherBatch, {
          id: batchId,
          ownerType: VoucherOwnerType.INSTITUTION,
          ownerInstitutionId: params.institutionId,
          ownerInstitution: { id: params.institutionId },
          quantity: plan.voucherQuantity,
          totalPrice: chargedAmount,
          currency: charged.currency,
          unitPrice: minorUnitsToDecimal(
            BigInt(charged.amountMinor) / BigInt(plan.voucherQuantity),
            2,
          ),
          paymentProvider: params.gateway,
          status: VoucherBatchStatus.PENDING,
          idempotencyKey: null,
          expectedAmountMinor: charged.amountMinor,
          shortCode: randomBytes(4).toString('hex').toUpperCase(),
        });
        await manager.save(voucherBatch);
        await manager.save(
          manager.create(CheckoutAttempt, {
            id: attemptId,
            ownerInstitutionId: params.institutionId,
            buyerUserId: userId,
            gateway: params.gateway,
            state: 'PROVIDER_CREATING',
            clientKeyDigest: digest,
            requestFingerprint: fingerprint,
            providerIdempotencyKey,
            commercialSnapshot: snapshot,
            voucherBatchId: batchId,
            voucherBatch,
          }),
        );
        return voucherBatch;
      },
    );

    if (params.gateway === 'MERCADO_PAGO') {
      return this.createMercadoPagoCheckout(
        {
          id: attemptId,
          voucherBatchId: batchId,
          commercialSnapshot: snapshot,
          providerIdempotencyKey,
          voucherBatch: batch,
        },
        params,
        urls,
        plan,
      );
    }

    // Stripe deliberately retains the PR2 lifecycle and provider contract.
    try {
      const result = await this.stripeAdapter.createCheckout(
        this.checkoutRequest(
          batchId,
          snapshot,
          params,
          urls,
          plan,
          providerIdempotencyKey,
        ),
      );
      await this.checkoutAttemptRepo.manager.transaction(async (manager) => {
        batch.checkoutUrl = result.checkoutUrl;
        batch.paymentReference = result.externalReference;
        await manager.save(batch);
        await manager.save(CheckoutAttempt, {
          id: attemptId,
          state: 'READY',
          providerCheckoutId: result.externalReference,
          providerCheckoutUrl: result.checkoutUrl,
        });
      });
      return {
        checkoutUrl: result.checkoutUrl,
        voucherBatchId: batchId,
        checkoutAttemptId: attemptId,
      };
    } catch (error) {
      await this.checkoutAttemptRepo.manager.transaction(async (manager) => {
        batch.status = VoucherBatchStatus.FAILED;
        await manager.save(batch);
        await manager.save(CheckoutAttempt, {
          id: attemptId,
          state: 'FAILED',
          providerErrorCode:
            error instanceof Error ? error.name : 'PROVIDER_ERROR',
        });
      });
      throw error;
    }
  }

  private async createSnapshot(
    plan: PricingPlan,
    gateway: InitiateCheckoutParams['gateway'],
  ): Promise<CompleteCommercialSnapshot> {
    const listedUsdMinor = decimalToMinorUnits(String(plan.priceUsd), 2);
    const listedUsd = {
      amountMinor: listedUsdMinor.toString(),
      currency: 'USD' as const,
    };
    if (gateway === 'STRIPE')
      return {
        kind: 'COMPLETE',
        pricingPlanId: plan.id,
        planName: plan.name,
        voucherQuantity: plan.voucherQuantity,
        listedUsd,
        charged: listedUsd,
        gateway,
      };
    const quote = await this.exchangeRateService.getUsdToArsQuote();
    const chargedDecimal = multiplyAndRoundHalfUp(
      String(plan.priceUsd),
      quote.rate,
      2,
    );
    return {
      kind: 'COMPLETE',
      pricingPlanId: plan.id,
      planName: plan.name,
      voucherQuantity: plan.voucherQuantity,
      listedUsd,
      charged: {
        amountMinor: decimalToMinorUnits(chargedDecimal, 2).toString(),
        currency: 'ARS',
      },
      gateway,
      fxRate: quote.rate,
      fxQuotedAt: quote.quotedAt.toISOString(),
      fxSource: quote.source,
    };
  }

  private async findExisting(
    params: InitiateCheckoutParams,
    userId: string,
    digest: string,
  ) {
    const where = {
      ownerInstitutionId: params.institutionId,
      buyerUserId: userId,
    };
    if (params.checkoutAttemptId)
      return this.checkoutAttemptRepo.findOneBy({
        ...where,
        id: params.checkoutAttemptId,
      });
    return this.checkoutAttemptRepo.findOneBy({
      ...where,
      clientKeyDigest: digest,
    });
  }

  private async resumeMercadoPago(
    attempt: CheckoutAttempt,
    fingerprint: string,
    digest: string,
    params: InitiateCheckoutParams,
    urls: { frontendOrigin: string; notificationUrl: string },
    plan: PricingPlan,
  ) {
    this.assertCompatible(attempt, fingerprint, digest);
    if (attempt.state === 'READY')
      return this.resumeExisting(attempt, fingerprint, digest);
    return this.createMercadoPagoCheckout(attempt, params, urls, plan);
  }

  private async createMercadoPagoCheckout(
    attempt: Pick<
      CheckoutAttempt,
      'id' | 'voucherBatchId' | 'commercialSnapshot' | 'providerIdempotencyKey'
    > & { voucherBatch?: VoucherBatch | null },
    params: InitiateCheckoutParams,
    urls: { frontendOrigin: string; notificationUrl: string },
    plan: PricingPlan,
  ) {
    if (!attempt.voucherBatchId) {
      throw new ConflictException('Checkout batch is unavailable');
    }
    const snapshot = attempt.commercialSnapshot;
    const batch =
      attempt.voucherBatch ??
      (await this.checkoutAttemptRepo.manager.findOneBy(VoucherBatch, {
        id: attempt.voucherBatchId,
      }));
    if (!batch) throw new ConflictException('Checkout batch is unavailable');
    let result;
    try {
      // Provider I/O is intentionally outside both claim and finalization transactions.
      result = await this.mpAdapter.createCheckout(
        this.checkoutRequest(
          attempt.voucherBatchId,
          snapshot,
          params,
          urls,
          plan,
          attempt.providerIdempotencyKey,
        ),
      );
    } catch (error) {
      await this.finalizeMercadoPagoError(attempt, batch, error);
      throw error;
    }
    if (result.merchantReference !== attempt.voucherBatchId) {
      const error = new Error('MercadoPago preference reference mismatch');
      await this.finalizeMercadoPagoError(attempt, batch, error);
      throw error;
    }
    return this.finalizeMercadoPagoReady(attempt, batch, result);
  }

  private async finalizeMercadoPagoReady(
    attempt: Pick<CheckoutAttempt, 'id' | 'voucherBatchId'>,
    batch: VoucherBatch,
    result: { checkoutUrl: string; externalReference: string },
  ) {
    await this.checkoutAttemptRepo.manager.transaction(async (manager) => {
      batch.checkoutUrl = result.checkoutUrl;
      batch.paymentReference = result.externalReference;
      await manager.save(batch);
      await manager.save(CheckoutAttempt, {
        id: attempt.id,
        state: 'READY',
        providerCheckoutId: result.externalReference,
        providerCheckoutUrl: result.checkoutUrl,
      });
    });
    return {
      checkoutUrl: result.checkoutUrl,
      voucherBatchId: attempt.voucherBatchId!,
      checkoutAttemptId: attempt.id,
    };
  }

  private async finalizeMercadoPagoError(
    attempt: Pick<CheckoutAttempt, 'id'>,
    batch: VoucherBatch,
    error: unknown,
  ) {
    const ambiguous = this.isAmbiguousTransportError(error);
    await this.checkoutAttemptRepo.manager.transaction(async (manager) => {
      if (!ambiguous) {
        batch.status = VoucherBatchStatus.FAILED;
        await manager.save(batch);
      }
      await manager.save(CheckoutAttempt, {
        id: attempt.id,
        state: ambiguous ? 'OUTCOME_UNKNOWN' : 'FAILED',
        providerErrorCode:
          error instanceof Error ? error.name : 'PROVIDER_ERROR',
      });
    });
  }

  private checkoutRequest(
    voucherBatchId: string,
    snapshot: CompleteCommercialSnapshot,
    params: InitiateCheckoutParams,
    urls: { frontendOrigin: string; notificationUrl: string },
    plan: PricingPlan,
    providerIdempotencyKey: string,
  ): CheckoutRequest {
    return {
      voucherBatchId,
      priceUsd: Number(
        minorUnitsToDecimal(BigInt(snapshot.listedUsd.amountMinor), 2),
      ),
      priceArs:
        snapshot.gateway === 'MERCADO_PAGO'
          ? Number(minorUnitsToDecimal(BigInt(snapshot.charged.amountMinor), 2))
          : undefined,
      successUrl: this.safeRedirectUrl(
        params.successUrl,
        `${urls.frontendOrigin}/billing/success?batchId=${voucherBatchId}`,
        urls.frontendOrigin,
      ),
      failureUrl: this.safeRedirectUrl(
        params.failureUrl,
        `${urls.frontendOrigin}/billing/failure`,
        urls.frontendOrigin,
      ),
      notificationUrl: urls.notificationUrl,
      buyerEmail: params.buyerEmail,
      description: `A.kit - Lote de ${plan.voucherQuantity} Vouchers (${plan.name})`,
      providerIdempotencyKey,
    };
  }

  private isAmbiguousTransportError(error: unknown): boolean {
    const record = error as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const code = typeof record?.code === 'string' ? record.code : '';
    const name = typeof record?.name === 'string' ? record.name : '';
    const message = typeof record?.message === 'string' ? record.message : '';
    const text = `${name} ${message}`;
    return (
      /^(ETIMEDOUT|ECONNRESET|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH)$/i.test(
        code,
      ) || /timeout|network|socket|connection reset|aborted/i.test(text)
    );
  }

  private assertCompatible(
    attempt: CheckoutAttempt,
    fingerprint: string,
    digest: string,
  ) {
    if (
      attempt.clientKeyDigest !== digest ||
      attempt.requestFingerprint !== fingerprint
    ) {
      throw new ConflictException(
        'Checkout request conflicts with an existing attempt',
      );
    }
  }

  private resumeExisting(
    attempt: CheckoutAttempt,
    fingerprint: string,
    digest: string,
  ) {
    if (
      attempt.clientKeyDigest !== digest ||
      attempt.requestFingerprint !== fingerprint ||
      attempt.state !== 'READY' ||
      !attempt.providerCheckoutUrl ||
      !attempt.voucherBatchId
    )
      throw new ConflictException(
        'Checkout request conflicts with an existing attempt',
      );
    return {
      checkoutUrl: attempt.providerCheckoutUrl,
      voucherBatchId: attempt.voucherBatchId,
      checkoutAttemptId: attempt.id,
    };
  }

  private requireBuyer(value?: string): string {
    if (!value)
      throw new ConflictException(
        'Checkout request conflicts with an existing attempt',
      );
    return value;
  }
  private requireIdempotencySecret(): string {
    const secret = process.env.PAYMENT_IDEMPOTENCY_SECRET?.trim();
    if (!secret)
      throw new BadRequestException('PAYMENT_IDEMPOTENCY_SECRET is required');
    return secret;
  }
  private requireIdempotencyKey(value?: string): string {
    const key = value?.trim();
    if (!key || key.length > 128)
      throw new BadRequestException(
        'X-Idempotency-Key is required and must be at most 128 characters',
      );
    return key;
  }
  private configuredFrontendOrigin(value: string): string {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error();
      return url.origin;
    } catch {
      throw new BadRequestException(
        'FRONTEND_URL must be a configured HTTPS origin',
      );
    }
  }
  private resolveCheckoutUrls(gateway: InitiateCheckoutParams['gateway']) {
    const frontendUrl = process.env.WEB_APP_URL || process.env.FRONTEND_URL;
    const apiUrl = process.env.API_URL;
    if (!frontendUrl || !apiUrl)
      throw new BadRequestException('Payment checkout URLs must be configured');
    return {
      frontendOrigin: this.configuredFrontendOrigin(frontendUrl),
      notificationUrl: `${this.configuredApiOrigin(apiUrl)}/api/v1/webhooks/payments/${gateway.toLowerCase()}`,
    };
  }
  private configuredApiOrigin(value: string): string {
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      )
        throw new Error();
      return url.origin;
    } catch {
      throw new BadRequestException(
        'API_URL must be a configured HTTPS origin',
      );
    }
  }
  private safeRedirectUrl(
    candidate: string | undefined,
    fallback: string,
    configuredOrigin: string,
  ): string {
    if (!candidate) return fallback;
    try {
      const url = new URL(candidate);
      return url.protocol === 'https:' && url.origin === configuredOrigin
        ? url.toString()
        : fallback;
    } catch {
      return fallback;
    }
  }
}
