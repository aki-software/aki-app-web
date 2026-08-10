import { Injectable } from '@nestjs/common';
import {
  createVerifiedPayment,
  type CheckoutRequest,
  type CheckoutResponse,
  type PaymentGatewayAdapter,
  type VerifiedPayment,
} from '../interfaces/payment-gateway.adapter.js';

@Injectable()
export class SimulationPaymentGatewayAdapter implements PaymentGatewayAdapter {
  createCheckout(params: CheckoutRequest): Promise<CheckoutResponse> {
    return Promise.resolve({
      checkoutUrl: `${params.successUrl}?simulation=true&batchId=${params.voucherBatchId}`,
      externalReference: `simulation_checkout_${params.voucherBatchId}`,
    });
  }

  validateWebhook(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getPaymentStatus(externalPaymentId: string): Promise<VerifiedPayment> {
    return Promise.resolve(
      createVerifiedPayment({
        providerPaymentId: externalPaymentId,
        merchantReference: externalPaymentId.replace(
          'simulation_checkout_',
          '',
        ),
        amountMinor: 0n,
        currency: 'USD',
        status: 'PENDING',
      }),
    );
  }

  extractPaymentReference(): string | undefined {
    return undefined;
  }
}
