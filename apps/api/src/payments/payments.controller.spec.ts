import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { CheckoutService } from './services/checkout.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingPlan } from './entities/pricing-plan.entity';

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
        productId: 'report_unlock',
        purchaseToken: 'token-abc',
      };

      const expectedResult = { success: true, valid: true };
      jest
        .mocked(service.verifyGooglePlayPurchase)
        .mockResolvedValue(expectedResult);

      const result = await controller.verifyGooglePlay(dto);

      expect(service.verifyGooglePlayPurchase).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });
});
