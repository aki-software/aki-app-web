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
  PaymentStatus,
  WebhookEventType,
} from '../interfaces/payment-gateway.interface.js';

@Injectable()
export class StripeAdapter implements PaymentGateway {
  readonly name: GatewayName = 'stripe';
  private readonly logger = new Logger(StripeAdapter.name);
  private stripeClient: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.error('STRIPE_SECRET_KEY is missing in environment');
      // For now, we don't throw in constructor to allow module initialization if Stripe is not primary,
      // but methods will throw if they try to use it and it failed to init, or we initialize a dummy and throw later.
      // Better yet, just initialize it if present.
      this.stripeClient = new Stripe(stripeKey || 'dummy');
    } else {
      this.stripeClient = new Stripe(stripeKey);
    }
  }

  private getStripeClient(): Stripe {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new InternalServerErrorException('Payment gateway not configured');
    }
    return this.stripeClient;
  }

  async createCheckoutSession(
    params: CreateSessionParams,
  ): Promise<CheckoutSessionResult> {
    const stripe = this.getStripeClient();

    // In Stripe, we use Price IDs. Since the new model uses VoucherPlan IDs,
    // if the existing system required Stripe Price IDs, they might be stored in a mapping.
    // The instructions say: "Instead of using stripePriceId, use plan.id as a metadata reference and set amount from plan.priceUsd (or priceArs if USD not set)."

    const amount = params.plan.priceUsd || params.plan.priceArs;
    const currency = params.plan.priceUsd ? 'usd' : 'ars';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            unit_amount: amount, // Stripe expects cents, assuming price is already in cents as before
            product_data: {
              name: params.plan.name,
              description: params.plan.description || undefined,
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

    return {
      checkoutUrl: session.url,
      gatewaySessionId: session.id,
    };
  }

  async verifyPayment(
    gatewayPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    const stripe = this.getStripeClient();
    try {
      const session = await stripe.checkout.sessions.retrieve(gatewayPaymentId);

      let status: PaymentStatus = 'pending';
      switch (session.payment_status) {
        case 'paid':
          status = 'approved';
          break;
        case 'unpaid':
          status = 'pending';
          break;
        default:
          status = 'rejected';
      }

      return {
        status,
        gatewayPaymentId: session.id,
        amountPaid: session.amount_total || 0,
        currency: (session.currency || 'usd').toUpperCase(),
      };
    } catch (error) {
      this.logger.error(
        `Error verifying Stripe payment ${gatewayPaymentId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEventResult> {
    const stripe = this.getStripeClient();
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
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new InternalServerErrorException('Webhook verification failed');
    }

    let type: WebhookEventType = 'pending';
    let gatewayPaymentId = '';
    let amountPaid = 0;
    let currency = 'usd';
    let institutionId: string | undefined;
    let userId: string | undefined;
    let voucherPlanId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        type = 'approved';
        gatewayPaymentId = session.id;
        amountPaid = session.amount_total || 0;
        currency = (session.currency || 'usd').toUpperCase();
        institutionId = session.metadata?.institutionId;
        userId = session.metadata?.userId;
        voucherPlanId = session.metadata?.planId;
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object;
        type = 'rejected';
        gatewayPaymentId = session.id;
        amountPaid = session.amount_total || 0;
        currency = (session.currency || 'usd').toUpperCase();
        institutionId = session.metadata?.institutionId;
        userId = session.metadata?.userId;
        voucherPlanId = session.metadata?.planId;
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        type = 'refunded';
        gatewayPaymentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.id;
        amountPaid = charge.amount_refunded || 0;
        currency = (charge.currency || 'usd').toUpperCase();
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        type = 'chargeback';
        gatewayPaymentId =
          typeof dispute.charge === 'string'
            ? dispute.charge
            : (dispute.payment_intent as string) || dispute.id;
        amountPaid = dispute.amount;
        currency = (dispute.currency || 'usd').toUpperCase();
        break;
      }
      default:
        type = 'pending';
        gatewayPaymentId = event.id;
    }

    return {
      type,
      gatewayPaymentId,
      amountPaid,
      currency,
      institutionId,
      userId,
      voucherPlanId,
      rawPayload: event as unknown as Record<string, unknown>,
    };
  }
}
