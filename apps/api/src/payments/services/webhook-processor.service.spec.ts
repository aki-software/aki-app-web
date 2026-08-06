import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: PAYMENT_GATEWAY_MP,
          useValue: { validateWebhook: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: PAYMENT_GATEWAY_STRIPE,
          useValue: { validateWebhook: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();
    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
