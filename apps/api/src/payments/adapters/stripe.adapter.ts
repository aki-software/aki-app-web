import { Injectable } from '@nestjs/common';
import { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import Stripe from 'stripe';

@Injectable()
export class StripeAdapter implements PaymentGatewayAdapter {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'test', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async createCheckout(
    params: any,
  ): Promise<{ checkoutUrl: string; externalReference: string }> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: params.description },
            unit_amount: Math.round(params.priceUsd * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.failureUrl,
      client_reference_id: params.voucherBatchId,
      metadata: { voucherBatchId: params.voucherBatchId },
    });
    return { checkoutUrl: session.url!, externalReference: session.id };
  }

  async validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      this.stripe.webhooks.constructEvent(
        rawBody,
        headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET || 'test',
      );
      return true;
    } catch {
      return false;
    }
  }

  async getPaymentStatus(externalReference: string): Promise<any> {
    return { status: 'APPROVED' };
  }
}
