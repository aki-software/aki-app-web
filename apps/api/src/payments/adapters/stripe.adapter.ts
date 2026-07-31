import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type {
  PaymentGateway,
  GatewayName,
  CreateSessionParams,
  CheckoutSessionResult,
  PaymentVerificationResult,
  WebhookEventResult,
  WebhookEventType,
} from '../interfaces/payment-gateway.interface.js';
import {
  STRIPE_EVENT_EXTRACTORS,
  STRIPE_SESSION_STATUS_MAP,
} from './stripe-event-extractors.js';

@Injectable()
export class StripeAdapter implements PaymentGateway {
  readonly name: GatewayName = 'stripe';
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripeClient: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? 'not-configured';
    this.stripeClient = new Stripe(stripeKey);
  }

  private getStripeClient(): Stripe {
    if (!this.configService.get<string>('STRIPE_SECRET_KEY')) {
      throw new InternalServerErrorException('Payment gateway not configured');
    }
    return this.stripeClient;
  }

  async createCheckoutSession(
    params: CreateSessionParams,
  ): Promise<CheckoutSessionResult> {
    const stripe = this.getStripeClient();
    const amount = params.plan.priceUsd ?? params.plan.priceArs;
    const currency = params.plan.priceUsd ? 'usd' : 'ars';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: params.plan.name,
              description: params.plan.description ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        institutionId: params.institutionId,
        userId: params.userId,
        planId: params.plan.id,
      },
      client_reference_id: params.institutionId,
    });

    if (!session.url) {
      throw new InternalServerErrorException(
        'Failed to create Stripe checkout session',
      );
    }

    return { checkoutUrl: session.url, gatewaySessionId: session.id };
  }

  async verifyPayment(
    gatewayPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    const stripe = this.getStripeClient();
    try {
      const session = await stripe.checkout.sessions.retrieve(gatewayPaymentId);
      return {
        status:
          STRIPE_SESSION_STATUS_MAP[session.payment_status ?? ''] ?? 'rejected',
        gatewayPaymentId: session.id,
        amountPaid: session.amount_total ?? 0,
        currency: (session.currency ?? 'usd').toUpperCase(),
      };
    } catch (error) {
      this.logger.error(
        `Error verifying Stripe payment ${gatewayPaymentId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEventResult> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.getStripeClient().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new InternalServerErrorException('Webhook verification failed');
    }

    const extracted = STRIPE_EVENT_EXTRACTORS[event.type]?.(event) ?? {
      type: 'pending' as WebhookEventType,
      gatewayPaymentId: event.id,
      amountPaid: 0,
      currency: 'USD',
    };

    return Promise.resolve({
      ...extracted,
      rawPayload: JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
    });
  }
}
