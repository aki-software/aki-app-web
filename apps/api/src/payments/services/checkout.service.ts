import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
  toMinorUnits,
  type PaymentGatewayAdapter,
} from '../interfaces/payment-gateway.adapter.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import {
  VoucherOwnerType,
  VoucherBatchStatus,
} from '../../vouchers/entities/voucher.enums.js';
import * as crypto from 'crypto';
import { ExchangeRateService } from './exchange-rate.service.js';

interface InitiateCheckoutParams {
  planId: string;
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  institutionId: string;
  buyerEmail: string;
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
    @InjectRepository(VoucherBatch)
    private voucherBatchRepo: Repository<VoucherBatch>,
    private exchangeRateService: ExchangeRateService,
  ) {}

  async initiateCheckout(params: InitiateCheckoutParams) {
    const idempotencyKey = this.requireIdempotencyKey(params.idempotencyKey);
    const existing = await this.findExistingCheckout(
      params.institutionId,
      idempotencyKey,
    );
    if (existing?.checkoutUrl) {
      return {
        checkoutUrl: existing.checkoutUrl,
        voucherBatchId: existing.id,
      };
    }

    const checkoutUrls = this.resolveCheckoutUrls(params.gateway);

    const plan = await this.pricingPlanRepo.findOneBy({
      id: params.planId,
      isActive: true,
    });
    if (!plan) {
      throw new NotFoundException('Pricing plan not found or inactive');
    }

    const adapter =
      params.gateway === 'MERCADO_PAGO' ? this.mpAdapter : this.stripeAdapter;
    const priceUsd = Number(plan.priceUsd);
    let priceArs: number | undefined;

    if (params.gateway === 'MERCADO_PAGO') {
      const exchangeRate = await this.exchangeRateService.getUsdToArsRate();
      priceArs = priceUsd * exchangeRate;
    }

    const voucherBatch = this.voucherBatchRepo.create({
      ownerType: VoucherOwnerType.INSTITUTION,
      ownerInstitution: { id: params.institutionId },
      ownerInstitutionId: params.institutionId,
      quantity: plan.voucherQuantity,
      totalPrice: String(
        params.gateway === 'MERCADO_PAGO' ? priceArs : priceUsd,
      ),
      currency: params.gateway === 'MERCADO_PAGO' ? 'ARS' : 'USD',
      unitPrice: String(
        (params.gateway === 'MERCADO_PAGO' ? priceArs! : priceUsd) /
          plan.voucherQuantity,
      ),
      paymentProvider: params.gateway,
      status: VoucherBatchStatus.PENDING,
      idempotencyKey,
      expectedAmountMinor: toMinorUnits(
        String(params.gateway === 'MERCADO_PAGO' ? priceArs : priceUsd),
        params.gateway === 'MERCADO_PAGO' ? 'ARS' : 'USD',
      ).toString(),
      shortCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    });

    // The unique institution/key index is the multi-instance authority. If a
    // concurrent request won the insert, reuse its checkout instead of calling
    // the gateway a second time.
    try {
      await this.voucherBatchRepo.save(voucherBatch);
    } catch (error) {
      const concurrentCheckout = await this.findExistingCheckout(
        params.institutionId,
        idempotencyKey,
      );
      if (concurrentCheckout?.checkoutUrl) {
        return {
          checkoutUrl: concurrentCheckout.checkoutUrl,
          voucherBatchId: concurrentCheckout.id,
        };
      }
      throw error;
    }

    const { frontendOrigin, notificationUrl } = checkoutUrls;

    try {
      const result = await adapter.createCheckout({
        voucherBatchId: voucherBatch.id,
        priceUsd,
        priceArs,
        successUrl: this.safeRedirectUrl(
          params.successUrl,
          `${frontendOrigin}/billing/success?batchId=${voucherBatch.id}`,
          frontendOrigin,
        ),
        failureUrl: this.safeRedirectUrl(
          params.failureUrl,
          `${frontendOrigin}/billing/failure`,
          frontendOrigin,
        ),
        notificationUrl,
        buyerEmail: params.buyerEmail,
        description: `A.kit - Lote de ${plan.voucherQuantity} Vouchers (${plan.name})`,
      });

      voucherBatch.paymentReference = result.externalReference;
      voucherBatch.checkoutUrl = result.checkoutUrl;
      await this.voucherBatchRepo.save(voucherBatch);

      return {
        checkoutUrl: result.checkoutUrl,
        voucherBatchId: voucherBatch.id,
      };
    } catch (error) {
      voucherBatch.status = VoucherBatchStatus.FAILED;
      await this.voucherBatchRepo.save(voucherBatch);
      throw error;
    }
  }

  private requireIdempotencyKey(value?: string): string {
    const key = value?.trim();
    if (!key || key.length > 128) {
      throw new BadRequestException(
        'X-Idempotency-Key is required and must be at most 128 characters',
      );
    }
    return key;
  }

  private async findExistingCheckout(
    institutionId: string,
    idempotencyKey: string,
  ): Promise<VoucherBatch | null> {
    const repository = this.voucherBatchRepo as Repository<VoucherBatch> & {
      findOneBy?: (
        where: Partial<VoucherBatch>,
      ) => Promise<VoucherBatch | null>;
    };
    return repository.findOneBy
      ? repository.findOneBy({
          ownerInstitutionId: institutionId,
          idempotencyKey,
        })
      : null;
  }

  private configuredFrontendOrigin(value: string): string {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error();
      }
      return url.origin;
    } catch {
      throw new BadRequestException(
        'FRONTEND_URL must be a configured HTTPS origin',
      );
    }
  }

  private resolveCheckoutUrls(gateway: InitiateCheckoutParams['gateway']): {
    frontendOrigin: string;
    notificationUrl: string;
  } {
    const frontendUrl = process.env.FRONTEND_URL;
    const apiUrl = process.env.API_URL;
    if (!frontendUrl || !apiUrl) {
      throw new BadRequestException('Payment checkout URLs must be configured');
    }

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
      ) {
        throw new Error();
      }
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
