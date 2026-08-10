import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { CheckoutService } from './services/checkout.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingPlan } from './entities/pricing-plan.entity';
import { RateLimitService } from '../common/services/rate-limit.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            verifyGooglePlayPurchase: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
        user: { userId: 'patient-123', institutionId: 'institution-123' },
      };
      const result = await controller.verifyGooglePlay(dto, request as never);

      expect(service.verifyGooglePlayPurchase).toHaveBeenCalledWith(dto, {
        userId: 'patient-123',
        institutionId: 'institution-123',
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
