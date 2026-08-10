import {
  Controller,
  Post,
  Req,
  Headers,
  Param,
  BadRequestException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { WebhookProcessorService } from './services/webhook-processor.service.js';
import type { Request } from 'express';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { PAYMENT_RATE_LIMIT_POLICIES } from './payment-security.constants.js';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks/payments')
export class WebhookController {
  constructor(private readonly webhookProcessor: WebhookProcessorService) {}

  @Post(':gateway')
  @UseGuards(RateLimitGuard)
  @RateLimit(
    PAYMENT_RATE_LIMIT_POLICIES.webhook.limit,
    PAYMENT_RATE_LIMIT_POLICIES.webhook.windowMs,
    PAYMENT_RATE_LIMIT_POLICIES.webhook.policy,
  )
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Req() req: RequestWithRawBody,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const validGateways = ['MERCADO_PAGO', 'STRIPE'];
    const gatewayUpper = gateway.toUpperCase();
    if (!validGateways.includes(gatewayUpper)) {
      throw new BadRequestException('Invalid payment gateway');
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('Webhook raw body is required');
    }

    const result = await this.webhookProcessor.processWebhook({
      gateway: gatewayUpper as 'MERCADO_PAGO' | 'STRIPE',
      rawBody: req.rawBody,
      headers,
      body: req.body,
      query: Object.entries(req.query ?? {}).reduce<
        Record<string, string | string[] | undefined>
      >((query, [key, value]) => {
        if (typeof value === 'string') query[key] = value;
        if (
          Array.isArray(value) &&
          value.every((item) => typeof item === 'string')
        )
          query[key] = value;
        return query;
      }, {}),
    });
    if (result?.outcome === 'PENDING_RETRY') {
      throw new ServiceUnavailableException(
        'Payment provider status unavailable',
      );
    }

    return { received: true };
  }
}
