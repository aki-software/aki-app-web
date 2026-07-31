import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  RawBodyRequest,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PaymentGatewayRegistry } from './services/payment-gateway.registry.js';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants.js';
import type { QueueAdapter } from '../common/adapters/queue.adapter.js';
import { JobNames } from '../common/jobs/job-names.js';
import type { GatewayName } from './interfaces/payment-gateway.interface.js';

@Controller('public/payments')
export class PublicPaymentsController {
  constructor(
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    @Inject(QUEUE_ADAPTER) private readonly queueAdapter: QueueAdapter,
  ) {}

  @Post('webhook/:gateway')
  async handleWebhook(
    @Param('gateway') gateway: GatewayName,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
    @Headers('x-signature') genericSignature: string,
  ) {
    const signature = stripeSignature || genericSignature;
    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const adapter = this.gatewayRegistry.get(gateway);
    const event = await adapter.constructWebhookEvent(req.rawBody, signature);

    // Enqueue the payload for background processing
    await this.queueAdapter
      .enqueue(
        JobNames.ProcessPaymentWebhook,
        {
          gatewayName: gateway,
          event,
        },
        { attempts: 3, backoffMs: 1000, backoffType: 'exponential' },
      )
      .catch((err) => {
        console.error('Failed to enqueue webhook processing', err);
      });

    return { received: true };
  }
}
