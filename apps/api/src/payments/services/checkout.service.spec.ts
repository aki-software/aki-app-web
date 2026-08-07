import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity';
import { ExchangeRateService } from './exchange-rate.service';

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
        {
          provide: getRepositoryToken(PricingPlan),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(VoucherBatch),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: ExchangeRateService,
          useValue: { getUsdToArsRate: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
