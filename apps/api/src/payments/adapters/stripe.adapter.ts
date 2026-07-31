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

// ---------------------------------------------------------------------------
// Per-event extractor types
// ---------------------------------------------------------------------------

/** Subset of WebhookEventResult fields that event-specific extractors populate. */
type ExtractedEventFields = Omit<WebhookEventResult, 'rawPayload'>;

/** A function that knows how to convert a specific Stripe event into our domain model. */
type StripeEventExtractor = (
  event: Stripe.Event,
) => ExtractedEventFields | null;

// ---------------------------------------------------------------------------
// Stripe status lookup
// ---------------------------------------------------------------------------

const STRIPE_SESSION_STATUS_MAP: Record<string, PaymentStatus> = {
  paid: 'approved',
  unpaid: 'pending',
};

// ---------------------------------------------------------------------------
// Per-event extractors — add a new Stripe event = add one entry here
// ---------------------------------------------------------------------------

const STRIPE_EVENT_EXTRACTORS: Record<string, StripeEventExtractor> = {
  'checkout.session.completed': extractCheckoutSession('approved'),
  'checkout.session.async_payment_succeeded':
    extractCheckoutSession('approved'),
  'checkout.session.async_payment_failed': extractCheckoutSession('rejected'),
  'checkout.session.expired': extractCheckoutSession('rejected'),

  'charge.refunded': (event) => {
    const charge = event.data.object as Stripe.Charge;
    return {
      type: 'refunded',
      gatewayPaymentId:
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.id,
      amountPaid: charge.amount_refunded ?? 0,
      currency: (charge.currency ?? 'usd').toUpperCase(),
    };
  },

  'charge.dispute.created': (event) => {
    const dispute = event.data.object as Stripe.Dispute;
    const intentId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : null;
    return {
      type: 'chargeback',
      gatewayPaymentId:
        typeof dispute.charge === 'string'
          ? dispute.charge
          : (intentId ?? dispute.id),
      amountPaid: dispute.amount,
      currency: (dispute.currency ?? 'usd').toUpperCase(),
    };
  },
};

/** Factory that creates a checkout-session extractor for a given event type. */
function extractCheckoutSession(type: WebhookEventType): StripeEventExtractor {
  return (event) => {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      type,
      gatewayPaymentId: session.id,
      amountPaid: session.amount_total ?? 0,
      currency: (session.currency ?? 'usd').toUpperCase(),
      institutionId: session.metadata?.institutionId,
      userId: session.metadata?.userId,
      voucherPlanId: session.metadata?.planId,
    };
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getStripeClient(): Stripe {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new InternalServerErrorException('Payment gateway not configured');
    }
    return this.stripeClient;
  }

  // ---------------------------------------------------------------------------
  // PaymentGateway interface
  // ---------------------------------------------------------------------------

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
            unit_amount: amount, // already in minor currency units (cents)
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

      const status: PaymentStatus =
        STRIPE_SESSION_STATUS_MAP[session.payment_status ?? ''] ?? 'rejected';

      return {
        status,
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

    const extractor = STRIPE_EVENT_EXTRACTORS[event.type];
    const extracted = extractor?.(event) ?? {
      type: 'pending' as WebhookEventType,
      gatewayPaymentId: event.id,
      amountPaid: 0,
      currency: 'USD',
    };

    return {
      ...extracted,
      rawPayload: JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
    };
  }
}
