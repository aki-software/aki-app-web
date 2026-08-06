import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
  PaymentGatewayAdapter,
} from '../interfaces/payment-gateway.adapter.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WebhookProcessorService {
  constructor(
    private eventEmitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY_MP) private mpAdapter: PaymentGatewayAdapter,
    @Inject(PAYMENT_GATEWAY_STRIPE)
    private stripeAdapter: PaymentGatewayAdapter,
  ) {}

  async processWebhook(params: any) {
    const adapter =
      params.gateway === 'MERCADO_PAGO' ? this.mpAdapter : this.stripeAdapter;
    const isValid = await adapter.validateWebhook(
      params.rawBody,
      params.headers,
    );
    if (!isValid) throw new ForbiddenException();

    // Very basic mock implementation
    this.eventEmitter.emit('payment.completed', {
      voucherBatchId: 'batch-123',
      institutionId: 'inst-123',
      buyerEmail: 'test@test.com',
      planName: 'test',
      voucherQuantity: 10,
      gateway: params.gateway,
    });
  }
}
