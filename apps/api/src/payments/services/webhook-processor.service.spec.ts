import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter';

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
});
