import type { VoucherPlan } from '../entities/voucher-plan.entity.js';

export type GatewayName = 'mercadopago' | 'stripe' | 'google_play';

export type PaymentStatus = 'approved' | 'pending' | 'rejected';
export type WebhookEventType =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'refunded'
  | 'chargeback';

export interface CreateSessionParams {
  plan: VoucherPlan;
  institutionId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  gatewaySessionId: string;
}

export interface PaymentVerificationResult {
  status: PaymentStatus;
  gatewayPaymentId: string;
  amountPaid: number;
  currency: string;
}

export interface WebhookEventResult {
  type: WebhookEventType;
  gatewayPaymentId: string;
  amountPaid: number;
  currency: string;
  institutionId?: string;
  userId?: string;
  voucherPlanId?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly name: GatewayName;
  createCheckoutSession(
    params: CreateSessionParams,
  ): Promise<CheckoutSessionResult>;
  verifyPayment(gatewayPaymentId: string): Promise<PaymentVerificationResult>;
  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEventResult>;
}
