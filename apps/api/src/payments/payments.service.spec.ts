import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { SessionsService } from '../sessions/sessions.service';
import { ConfigService } from '@nestjs/config';
import { SessionPaymentStatus } from '@akit/contracts';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: SessionsService,
          useValue: {
            findOne: jest.fn(),
            updatePaymentStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Pending implementation of Google API

  it('should treat not-owned token as idempotent success when the session already references it', async () => {
    const publisher = {
      purchases: {
        products: {
          get: jest
            .fn()
            .mockRejectedValue(
              new Error('The product purchase is not owned by the user.'),
            ),
          consume: jest.fn(),
        },
      },
    } as any;

    const session = {
      id: 'session-1',
      paymentReference: 'token-abc',
      paymentStatus: SessionPaymentStatus.PAID,
    };

    const result = await (service as any).verifyAndProcessPurchase(
      publisher,
      'com.example.app',
      {
        productId: 'report_unlock_v2',
        purchaseToken: 'token-abc',
      },
      session,
    );

    expect(result).toEqual({ success: true, valid: true });
    expect(publisher.purchases.products.get).toHaveBeenCalledTimes(1);
    // El backend nunca debe consumir la compra, esa responsabilidad recae en el cliente Android
    expect(publisher.purchases.products.consume).not.toHaveBeenCalled();
  });

  it('should NOT call consume on Google Play after successful verification', async () => {
    const publisher = {
      purchases: {
        products: {
          get: jest.fn().mockResolvedValue({
            data: { purchaseState: 0 },
          }),
          consume: jest.fn(),
        },
      },
    } as any;

    const mockSessionsService = service[
      'sessionsService'
    ] as jest.Mocked<SessionsService>;
    (mockSessionsService.updatePaymentStatus as jest.Mock).mockResolvedValue(
      {},
    );

    const session = {
      id: 'session-2',
      paymentReference: null,
      paymentStatus: SessionPaymentStatus.PENDING,
    };

    const result = await (service as any).verifyAndProcessPurchase(
      publisher,
      'com.example.app',
      {
        productId: 'report_unlock_v2',
        purchaseToken: 'token-xyz',
      },
      session,
    );

    expect(result).toEqual({ success: true, valid: true });
    // CRÍTICO: el backend jamás debe consumir. Solo el cliente Android lo hace.
    expect(publisher.purchases.products.consume).not.toHaveBeenCalled();
  });
});
