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
  let mpAdapter: { createCheckout: jest.Mock };
  let stripeAdapter: { createCheckout: jest.Mock };
  let voucherBatchRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(async () => {
    mpAdapter = {
      createCheckout: jest.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.example/mp',
        externalReference: 'mp-ref',
      }),
    };
    stripeAdapter = {
      createCheckout: jest.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.example/stripe',
        externalReference: 'stripe-ref',
      }),
    };
    voucherBatchRepository = {
      create: jest.fn().mockImplementation((batch) => ({
        id: 'batch-1',
        ...batch,
      })),
      save: jest.fn().mockResolvedValue(undefined),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: PAYMENT_GATEWAY_MP,
          useValue: mpAdapter,
        },
        {
          provide: PAYMENT_GATEWAY_STRIPE,
          useValue: stripeAdapter,
        },
        {
          provide: getRepositoryToken(PricingPlan),
          useValue: {
            findOneBy: jest.fn().mockResolvedValue({
              id: 'plan-1',
              isActive: true,
              priceUsd: '10.00',
              voucherQuantity: 2,
              name: 'Starter',
            }),
          },
        },
        {
          provide: getRepositoryToken(VoucherBatch),
          useValue: voucherBatchRepository,
        },
        {
          provide: ExchangeRateService,
          useValue: { getUsdToArsRate: jest.fn().mockResolvedValue(1000) },
        },
      ],
    }).compile();
    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    ['STRIPE', 'stripe'],
    ['MERCADO_PAGO', 'mercado_pago'],
  ] as const)(
    'uses the exact versioned %s webhook URL from a trailing-slash API origin',
    async (gateway, pathGateway) => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      const originalApiUrl = process.env.API_URL;
      process.env.FRONTEND_URL = 'https://app.example.com/';
      process.env.API_URL = 'https://api.example.com/';

      try {
        await service.initiateCheckout({
          planId: 'plan-1',
          gateway,
          institutionId: 'institution-1',
          buyerEmail: 'billing@example.com',
          idempotencyKey: `checkout-${pathGateway}`,
        });

        const adapter = gateway === 'STRIPE' ? stripeAdapter : mpAdapter;
        expect(adapter.createCheckout).toHaveBeenCalledWith(
          expect.objectContaining({
            notificationUrl: `https://api.example.com/api/v1/webhooks/payments/${pathGateway}`,
          }),
        );
      } finally {
        process.env.FRONTEND_URL = originalFrontendUrl;
        process.env.API_URL = originalApiUrl;
      }
    },
  );

  it('rejects an API URL with a path before persisting a checkout batch', async () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;
    const originalApiUrl = process.env.API_URL;
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.API_URL = 'https://api.example.com/invalid-path';

    try {
      await expect(
        service.initiateCheckout({
          planId: 'plan-1',
          gateway: 'STRIPE',
          institutionId: 'institution-1',
          buyerEmail: 'billing@example.com',
          idempotencyKey: 'invalid-api-origin',
        }),
      ).rejects.toThrow('API_URL must be a configured HTTPS origin');
      expect(voucherBatchRepository.save).not.toHaveBeenCalled();
    } finally {
      process.env.FRONTEND_URL = originalFrontendUrl;
      process.env.API_URL = originalApiUrl;
    }
  });
});
