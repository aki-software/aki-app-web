export interface PaymentGatewayAdapter {
  createCheckout(params: {
    voucherBatchId: string;
    priceUsd: number;
    priceArs?: number;
    successUrl: string;
    failureUrl: string;
    notificationUrl: string;
    buyerEmail: string;
    description: string;
  }): Promise<{ checkoutUrl: string; externalReference: string }>;
  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean>;
  getPaymentStatus(externalPaymentId: string): Promise<{
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED';
    paidAmount?: number;
    currency?: string;
    externalReference?: string;
  }>;
  extractPaymentReference(body: any): string | undefined;
}

export const PAYMENT_GATEWAY_MP = 'PAYMENT_GATEWAY_MP';
export const PAYMENT_GATEWAY_STRIPE = 'PAYMENT_GATEWAY_STRIPE';
