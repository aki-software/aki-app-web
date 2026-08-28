import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { CheckoutService } from './services/checkout.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingPlan } from './entities/pricing-plan.entity';
import { RateLimitService } from '../common/services/rate-limit.service';
import type { PaymentStatus } from '@akit/contracts';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;
  let checkoutService: { initiateCheckout: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            verifyGooglePlayPurchase: jest.fn(),
            getCheckoutAttemptStatus: jest.fn(),
          },
        },
        {
          provide: CheckoutService,
          useValue: {
            initiateCheckout: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PricingPlan),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
          } satisfies Pick<RateLimitService, 'checkRateLimit'>,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
    checkoutService = module.get(CheckoutService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateCheckout', () => {
    it('forwards authenticated user and idempotency context and strictly returns the checkout attempt response', async () => {
      checkoutService.initiateCheckout.mockResolvedValue({
        checkoutUrl: 'https://checkout.example/session',
        voucherBatchId: '11111111-1111-4111-8111-111111111111',
        checkoutAttemptId: '22222222-2222-4222-8222-222222222222',
      });
      const dto = {
        planId: '33333333-3333-4333-8333-333333333333',
        gateway: 'STRIPE' as const,
      };
      const request = {
        user: {
          userId: '44444444-4444-4444-8444-444444444444',
          institutionId: '55555555-5555-4555-8555-555555555555',
          email: 'buyer@example.com',
        },
        rawHeaders: ['x-idempotency-key', 'client-key'],
      };

      await expect(
        controller.initiateCheckout(dto, request as never, 'client-key'),
      ).resolves.toEqual({
        checkoutUrl: 'https://checkout.example/session',
        voucherBatchId: '11111111-1111-4111-8111-111111111111',
        checkoutAttemptId: '22222222-2222-4222-8222-222222222222',
      });
      expect(checkoutService.initiateCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '44444444-4444-4444-8444-444444444444',
          institutionId: '55555555-5555-4555-8555-555555555555',
          idempotencyKey: 'client-key',
        }),
      );
    });
  });

  describe('getCheckoutAttemptStatus', () => {
    it('forwards route and authenticated scope and disables caching', async () => {
      const status: PaymentStatus = {
        paymentState: 'PENDING',
        fulfillmentState: 'NOT_APPLICABLE',
        provider: 'STRIPE',
        providerFreshness: 'NOT_OBSERVED',
        observedAt: null,
        staleAfter: null,
        checkoutAttemptId: '11111111-1111-4111-8111-111111111111',
        paymentEventId: null,
        voucherBatchId: null,
        commercialSnapshot: {
          kind: 'COMPLETE',
          pricingPlanId: '22222222-2222-4222-8222-222222222222',
          planName: 'Plan',
          voucherQuantity: 1,
          listedUsd: { amountMinor: '100', currency: 'USD' },
          charged: { amountMinor: '100', currency: 'USD' },
          gateway: 'STRIPE',
        },
        chargedTotal: { amountMinor: '100', currency: 'USD' },
        issuedVoucherCount: null,
        expectedVoucherCount: 1,
        voucherDiscrepancy: null,
      };
      jest.mocked(service.getCheckoutAttemptStatus).mockResolvedValue(status);
      const response = { setHeader: jest.fn() };
      const request = {
        user: {
          userId: '33333333-3333-4333-8333-333333333333',
          institutionId: '44444444-4444-4444-8444-444444444444',
        },
      };

      await expect(
        controller.getCheckoutAttemptStatus(
          '11111111-1111-4111-8111-111111111111',
          request as never,
          response as never,
        ),
      ).resolves.toEqual(status);
      expect(service.getCheckoutAttemptStatus).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        {
          userId: '33333333-3333-4333-8333-333333333333',
          institutionId: '44444444-4444-4444-8444-444444444444',
        },
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, no-store',
      );
    });
  });

  describe('verifyGooglePlay', () => {
    it('should call service and return its result', async () => {
      const dto: VerifyPlayPurchaseDto = {
        sessionId: 'session-123',
        productId: 'report_unlock_v2',
        purchaseToken: 'token-abc',
      };

      const expectedResult = { success: true, valid: true };
      jest
        .mocked(service.verifyGooglePlayPurchase)
        .mockResolvedValue(expectedResult);

      const request = {
        user: {
          userId: 'patient-123',
          email: 'patient@example.com',
          institutionId: 'institution-123',
        },
      };
      const result = await controller.verifyGooglePlay(dto, request as never);

      expect(service.verifyGooglePlayPurchase).toHaveBeenCalledWith(dto, {
        userId: 'patient-123',
        email: 'patient@example.com',
        institutionId: 'institution-123',
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
