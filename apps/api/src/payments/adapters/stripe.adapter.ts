import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import Stripe from 'stripe';

@Injectable()
export class StripeAdapter implements PaymentGatewayAdapter {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeAdapter.name);

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test', {
      apiVersion: '2026-07-29.dahlia', // SDK default matching
    });
  }

  async createCheckout(params: {
    voucherBatchId: string;
    priceUsd: number;
    priceArs?: number;
    successUrl: string;
    failureUrl: string;
    notificationUrl: string;
    buyerEmail: string;
    description: string;
  }): Promise<{ checkoutUrl: string; externalReference: string }> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: params.buyerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: params.description },
            unit_amount: Math.round(params.priceUsd * 100), // Stripe expects cents
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

    if (!session.url) {
      throw new Error('Failed to create Stripe session URL');
    }

    return {
      checkoutUrl: session.url,
      externalReference: session.id,
    };
  }

  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    const signature = headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !secret) {
      this.logger.warn(
        'Stripe webhook missing signature or secret not configured',
      );
      return Promise.resolve(false); // Stripe strict fail
    }

    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, secret);
      return Promise.resolve(true);
    } catch (err) {
      this.logger.error('Stripe webhook signature validation failed', err);
      return Promise.resolve(false);
    }
  }

  async getPaymentStatus(externalReference: string): Promise<{
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED';
    paidAmount?: number;
    currency?: string;
  }> {
    try {
      const session =
        await this.stripe.checkout.sessions.retrieve(externalReference);

      const getStatus = (): 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED' => {
        if (session.payment_status === 'paid') return 'APPROVED';
        if (session.status === 'expired') return 'EXPIRED';
        if (session.status === 'open') return 'PENDING';
        return 'REJECTED';
      };

      return {
        status: getStatus(),
        paidAmount: session.amount_total
          ? session.amount_total / 100
          : undefined,
        currency: session.currency?.toUpperCase(),
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch payment status for ${externalReference}`,
        err,
      );
      return { status: 'PENDING' };
    }
  }
}
