export type PaymentStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED';

export interface VerifiedPayment {
  providerPaymentId: string;
  merchantReference: string;
  amountMinor: bigint;
  currency: string;
  status: PaymentStatus;
}

export interface CheckoutRequest {
  voucherBatchId: string;
  priceUsd: number;
  priceArs?: number;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
  buyerEmail: string;
  description: string;
  /** Persisted for provider-side idempotency when an adapter supports it. */
  providerIdempotencyKey: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  externalReference: string;
}

export interface PaymentGatewayAdapter {
  createCheckout(params: CheckoutRequest): Promise<CheckoutResponse>;
  validateWebhook(
    rawBody: Buffer,
    context: WebhookVerificationContext,
  ): Promise<boolean>;
  getAuthenticatedWebhookPaymentId?(
    rawBody: Buffer,
    context: WebhookVerificationContext,
  ): Promise<string | undefined>;
  getPaymentStatus(externalPaymentId: string): Promise<VerifiedPayment>;
  extractPaymentReference(body: unknown): string | undefined;
}

export interface WebhookVerificationContext {
  headers: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

const currencyExponents: Record<string, number> = {
  ARS: 2,
  JPY: 0,
  USD: 2,
};

export function toMinorUnits(amount: string, currency: string): bigint {
  const normalizedCurrency = currency.toUpperCase();
  const exponent = currencyExponents[normalizedCurrency];
  if (exponent === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  if (!/^\d+(?:\.\d+)?$/.test(amount)) {
    throw new Error('Amount must be a non-negative decimal string');
  }

  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > exponent) {
    throw new Error(`${currency} amount exceeds the supported precision`);
  }

  return BigInt(`${whole}${fraction.padEnd(exponent, '0')}`);
}

export function createVerifiedPayment(
  payment: VerifiedPayment,
): VerifiedPayment {
  const currency = payment.currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Currency must be an ISO 4217 code');
  }
  if (!payment.providerPaymentId || !payment.merchantReference) {
    throw new Error(
      'Verified payments require provider and merchant references',
    );
  }
  if (payment.amountMinor < 0n) {
    throw new Error('Verified payment amount cannot be negative');
  }

  return { ...payment, currency };
}

export const PAYMENT_GATEWAY_MP = 'PAYMENT_GATEWAY_MP';
export const PAYMENT_GATEWAY_STRIPE = 'PAYMENT_GATEWAY_STRIPE';
