import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: PAYMENT_GATEWAY_MP,
          useValue: {
            createCheckout: jest.fn().mockResolvedValue({
              checkoutUrl: 'url',
              externalReference: 'ref',
            }),
          },
        },
        {
          provide: PAYMENT_GATEWAY_STRIPE,
          useValue: {
            createCheckout: jest.fn().mockResolvedValue({
              checkoutUrl: 'url',
              externalReference: 'ref',
            }),
          },
        },
      ],
    }).compile();
    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
