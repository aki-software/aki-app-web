import Stripe from 'stripe';
import type { WebhookEventType } from '../interfaces/payment-gateway.interface.js';

/** Subset of WebhookEventResult that event-specific extractors populate. */
export type ExtractedEventFields = {
  type: WebhookEventType;
  gatewayPaymentId: string;
  amountPaid: number;
  currency: string;
  institutionId?: string;
  userId?: string;
  voucherPlanId?: string;
};

/** Converts a specific Stripe event into our domain model. Returns null for unknown events. */
export type StripeEventExtractor = (
  event: Stripe.Event,
) => ExtractedEventFields | null;

/**
 * Factory: creates a checkout-session extractor for a given outcome type.
 * Reused for both succeeded and failed session events.
 */
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

/**
 * Maps every handled Stripe event type to its extractor.
 * Adding a new event type = one new entry here, nothing else changes.
 */
export const STRIPE_EVENT_EXTRACTORS: Record<string, StripeEventExtractor> = {
  'checkout.session.completed': extractCheckoutSession('approved'),
  'checkout.session.async_payment_succeeded': extractCheckoutSession('approved'),
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

/** Maps Stripe checkout session payment_status to our internal PaymentStatus. */
export const STRIPE_SESSION_STATUS_MAP: Record<string, 'approved' | 'pending' | 'rejected'> = {
  paid: 'approved',
  unpaid: 'pending',
};
