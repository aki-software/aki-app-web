import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter';
import { WebhookController } from '../webhook.controller';

const paymentGatewayAdapterMock = (): jest.Mocked<PaymentGatewayAdapter> => ({
  createCheckout: jest.fn(),
  validateWebhook: jest.fn().mockResolvedValue(true),
  getPaymentStatus: jest.fn(),
  extractPaymentReference: jest.fn(),
});

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
        {
          provide: PAYMENT_GATEWAY_MP,
          useValue: paymentGatewayAdapterMock(),
        },
        {
          provide: PAYMENT_GATEWAY_STRIPE,
          useValue: paymentGatewayAdapterMock(),
        },
      ],
    }).compile();
    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects Stripe webhooks before processing when Mercado Pago is active', async () => {
    const processWebhook = jest.fn();
    const controller = new WebhookController({ processWebhook } as never);
    const originalGateway = process.env.PAYMENT_GATEWAY;
    process.env.PAYMENT_GATEWAY = 'MERCADO_PAGO';

    try {
      await expect(
        controller.handleWebhook(
          'stripe',
          { rawBody: Buffer.from('{}'), body: {}, query: {} } as never,
          {},
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(processWebhook).not.toHaveBeenCalled();
    } finally {
      if (originalGateway === undefined) delete process.env.PAYMENT_GATEWAY;
      else process.env.PAYMENT_GATEWAY = originalGateway;
    }
  });
});
