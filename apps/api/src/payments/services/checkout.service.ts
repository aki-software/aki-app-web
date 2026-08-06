import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter.js';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import { ExchangeRateService } from './exchange-rate.service.js';

interface InitiateCheckoutParams {
  planId: string;
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  institutionId: string;
  buyerEmail: string;
  successUrl?: string;
  failureUrl?: string;
}

/**
 * Orchestrates the creation of a new payment intent.
 * 
 * Responsibilities:
 * 1. Validates the selected pricing plan.
 * 2. Applies currency conversion if the gateway (like MercadoPago) requires local currency.
 * 3. Creates a `VoucherBatch` in 'PENDING' state to track the intent.
 * 4. Calls the appropriate Gateway SDK (Stripe/MP) to generate a checkout URL.
 */
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
    let priceArs: number | undefined = undefined;

    if (params.gateway === 'MERCADO_PAGO') {
      const exchangeRate = await this.exchangeRateService.getUsdToArsRate();
      priceArs = priceUsd * exchangeRate;
    }

    const voucherBatch = this.voucherBatchRepo.create({
      institution: { id: params.institutionId },
      totalPrice: params.gateway === 'MERCADO_PAGO' ? priceArs : priceUsd,
      currency: params.gateway === 'MERCADO_PAGO' ? 'ARS' : 'USD',
      unitPrice:
        (params.gateway === 'MERCADO_PAGO' ? priceArs! : priceUsd) /
        plan.voucherQuantity,
      paymentProvider: params.gateway,
      status: 'PENDING',
    });

    // Save batch first so we have an ID for the gateway
    await this.voucherBatchRepo.save(voucherBatch);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const notificationUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/payments/${params.gateway.toLowerCase()}`;

    const result = await adapter.createCheckout({
      voucherBatchId: voucherBatch.id,
      priceUsd,
      priceArs,
      successUrl:
        params.successUrl ||
        `${baseUrl}/billing/success?batchId=${voucherBatch.id}`,
      failureUrl: params.failureUrl || `${baseUrl}/billing/failure`,
      notificationUrl,
      buyerEmail: params.buyerEmail,
      description: `A.kit - Lote de ${plan.voucherQuantity} Vouchers (${plan.name})`,
    });

    voucherBatch.paymentReference = result.externalReference;
    await this.voucherBatchRepo.save(voucherBatch);

    return {
      checkoutUrl: result.checkoutUrl,
      voucherBatchId: voucherBatch.id,
    };
  }
}
