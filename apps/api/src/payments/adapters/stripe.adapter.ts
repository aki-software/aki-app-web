import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createVerifiedPayment,
  type CheckoutRequest,
  type CheckoutResponse,
  type PaymentGatewayAdapter,
  type VerifiedPayment,
} from '../interfaces/payment-gateway.adapter.js';
import Stripe from 'stripe';

@Injectable()
export class StripeAdapter implements PaymentGatewayAdapter {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeAdapter.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required for Stripe payments');
    }
    if (!this.configService.get<string>('STRIPE_WEBHOOK_SECRET')) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required for Stripe payments');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-07-29.dahlia', // SDK default matching
    });
  }

  async createCheckout(params: CheckoutRequest): Promise<CheckoutResponse> {
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
    rawBody: Buffer,
    context:
      | { headers: Record<string, string | undefined> }
      | Record<string, string | undefined>,
  ): Promise<boolean> {
    if (!Buffer.isBuffer(rawBody)) return Promise.resolve(false);
    const headers = verificationHeaders(context);
    const signature = headers['stripe-signature'];
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!signature || !secret) {
      this.logger.warn(
        'Stripe webhook missing signature or secret not configured',
      );
      return Promise.resolve(false); // Stripe strict fail
    }

    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, secret, 300);
      return Promise.resolve(true);
    } catch {
      this.logger.error('Stripe webhook signature validation failed');
      return Promise.resolve(false);
    }
  }

  async getPaymentStatus(externalPaymentId: string): Promise<VerifiedPayment> {
    try {
      const session =
        await this.stripe.checkout.sessions.retrieve(externalPaymentId);

      let mappedStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED' =
        'PENDING';

      if (session.payment_status === 'paid') {
        mappedStatus = 'APPROVED';
      } else if (session.status === 'expired') {
        mappedStatus = 'EXPIRED';
      } else if (session.status === 'open') {
        mappedStatus = 'PENDING';
      } else {
        mappedStatus = 'REJECTED';
      }

      if (
        session.amount_total === null ||
        !session.currency ||
        !session.client_reference_id
      ) {
        throw new Error(
          'Stripe payment is missing immutable settlement fields',
        );
      }

      return createVerifiedPayment({
        providerPaymentId: session.id,
        merchantReference: session.client_reference_id,
        amountMinor: BigInt(session.amount_total),
        currency: session.currency,
        status: mappedStatus,
      });
    } catch (error) {
      this.logger.error('Error getting payment status', error);
      throw error;
    }
  }

  extractPaymentReference(body: unknown): string | undefined {
    if (!isRecord(body) || body.type !== 'checkout.session.completed') {
      return undefined;
    }
    const data = body.data;
    if (!isRecord(data) || !isRecord(data.object)) {
      return undefined;
    }
    return typeof data.object.id === 'string' ? data.object.id : undefined;
  }
}

function verificationHeaders(
  context:
    | { headers: Record<string, string | undefined> }
    | Record<string, string | undefined>,
): Record<string, string | undefined> {
  return isVerificationContext(context) ? context.headers : context;
}

function isVerificationContext(
  context:
    | { headers: Record<string, string | undefined> }
    | Record<string, string | undefined>,
): context is { headers: Record<string, string | undefined> } {
  return typeof context['headers'] === 'object' && context['headers'] !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
