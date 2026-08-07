import {
  Controller,
  Post,
  Req,
  Headers,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { WebhookProcessorService } from './services/webhook-processor.service.js';
import type { Request } from 'express';

interface RequestWithRawBody extends Request {
  rawBody?: string;
}

@Controller('webhooks/payments')
export class WebhookController {
  constructor(private readonly webhookProcessor: WebhookProcessorService) {}

  @Post(':gateway')
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Req() req: RequestWithRawBody,
    @Headers() headers: Record<string, string>,
  ) {
    const validGateways = ['MERCADO_PAGO', 'STRIPE'];
    const gatewayUpper = gateway.toUpperCase();
    if (!validGateways.includes(gatewayUpper)) {
      throw new BadRequestException('Invalid payment gateway');
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);

    await this.webhookProcessor.processWebhook({
      gateway: gatewayUpper as 'MERCADO_PAGO' | 'STRIPE',
      rawBody,
      headers,
      body: req.body,
    });

    return { received: true };
  }
}
