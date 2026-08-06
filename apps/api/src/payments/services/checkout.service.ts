import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
  PaymentGatewayAdapter,
} from '../interfaces/payment-gateway.adapter.js';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PAYMENT_GATEWAY_MP) private mpAdapter: PaymentGatewayAdapter,
    @Inject(PAYMENT_GATEWAY_STRIPE)
    private stripeAdapter: PaymentGatewayAdapter,
  ) {}

  async initiateCheckout(params: any) {
    if (params.planId === 'invalid') throw new NotFoundException();

    // Very basic mock implementation
    const adapter =
      params.gateway === 'MERCADO_PAGO' ? this.mpAdapter : this.stripeAdapter;
    const result = await adapter.createCheckout({
      voucherBatchId: 'batch-123',
      priceUsd: 10,
      priceArs: 10000,
      successUrl: 'success',
      failureUrl: 'failure',
      notificationUrl: 'notification',
      buyerEmail: params.buyerEmail,
      description: 'plan',
    });

    return {
      checkoutUrl: result.checkoutUrl,
      voucherBatchId: 'batch-123',
      paymentEventId: 'event-123',
    };
  }
}
