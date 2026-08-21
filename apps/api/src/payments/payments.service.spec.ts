import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { SessionsQueryService } from '../sessions/services/sessions-query.service';
import { SessionsMutationService } from '../sessions/services/sessions-mutation.service';
import { SessionPaymentStatus } from '@akit/contracts';
import { GooglePlayAdapter } from './google-play.adapter';
import { getDataSourceToken } from '@nestjs/typeorm';
import { SessionOwnerResolverService } from '../sessions/services/session-owner-resolver.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: SessionsQueryService,
          useValue: {
            findOne: jest.fn(),
            findOneForPaymentUnlock: jest.fn(),
            findByPaymentToken: jest.fn(),
          },
        },
        {
          provide: SessionOwnerResolverService,
          useValue: {
            resolveFirebaseUser: jest.fn(),
            resolveFirebasePatient: jest.fn(),
          },
        },
        {
          provide: SessionsMutationService,
          useValue: {
            updatePaymentStatus: jest.fn(),
            unlockReportEntitlement: jest.fn(),
          },
        },
        {
          provide: GooglePlayAdapter,
          useValue: {
            getAndroidPublisher: jest.fn(),
            getPackageName: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            manager: {
              find: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('resolves a Firebase patient UID to the internal patient ID before querying the session', async () => {
    const resolver = (service as any)
      .sessionOwnerResolverService as jest.Mocked<SessionOwnerResolverService>;
    resolver.resolveFirebasePatient.mockResolvedValue({
      id: 'patient-uuid',
      institutionId: 'institution-123',
    });

    const queryService = (service as any)
      .sessionsQueryService as jest.Mocked<SessionsQueryService>;
    queryService.findOneForPaymentUnlock = jest.fn().mockResolvedValue({
      id: 'session-123',
      results: [{}],
      reportUnlockedAt: new Date(),
      reportUnlockPurchaseToken: 'token-abc',
    });

    await service.verifyGooglePlayPurchase(
      {
        sessionId: 'session-123',
        productId: 'report_unlock_v2',
        purchaseToken: 'token-abc',
      },
      {
        userId: 'firebase-uid',
        email: 'patient@example.com',
        institutionId: 'institution-123',
      },
    );

    expect(resolver.resolveFirebasePatient).toHaveBeenCalledWith(
      { uid: 'firebase-uid', email: 'patient@example.com' },
      false,
    );
    expect(queryService.findOneForPaymentUnlock).toHaveBeenCalledWith(
      'session-123',
      'patient-uuid',
      'institution-123',
    );
  });

  it('fails closed when a Firebase patient has no internal patient mapping', async () => {
    const resolver = (service as any)
      .sessionOwnerResolverService as jest.Mocked<SessionOwnerResolverService>;
    resolver.resolveFirebasePatient.mockResolvedValue(null);

    const queryService = (service as any)
      .sessionsQueryService as jest.Mocked<SessionsQueryService>;

    await expect(
      service.verifyGooglePlayPurchase(
        {
          sessionId: 'session-123',
          productId: 'report_unlock_v2',
          purchaseToken: 'token-abc',
        },
        {
          userId: 'firebase-uid',
          email: 'patient@example.com',
          institutionId: 'institution-123',
        },
      ),
    ).rejects.toThrow('Unable to resolve payment patient');

    expect(resolver.resolveFirebasePatient).toHaveBeenCalledWith(
      { uid: 'firebase-uid', email: 'patient@example.com' },
      false,
    );
    expect(queryService.findOneForPaymentUnlock).not.toHaveBeenCalled();
  });

  it('keeps an internal UUID principal as the payment owner', async () => {
    const resolver = (service as any)
      .sessionOwnerResolverService as jest.Mocked<SessionOwnerResolverService>;
    const queryService = (service as any)
      .sessionsQueryService as jest.Mocked<SessionsQueryService>;
    queryService.findOneForPaymentUnlock = jest.fn().mockResolvedValue({
      id: 'session-123',
      results: [{}],
      reportUnlockedAt: new Date(),
      reportUnlockPurchaseToken: 'token-abc',
    });

    await service.verifyGooglePlayPurchase(
      {
        sessionId: 'session-123',
        productId: 'report_unlock_v2',
        purchaseToken: 'token-abc',
      },
      {
        userId: 'b3d6d89b-8f58-4fb1-aef5-3f0196c6c936',
        email: 'patient@example.com',
        institutionId: 'institution-123',
      },
    );

    expect(resolver.resolveFirebasePatient).not.toHaveBeenCalled();
    expect(queryService.findOneForPaymentUnlock).toHaveBeenCalledWith(
      'session-123',
      'b3d6d89b-8f58-4fb1-aef5-3f0196c6c936',
      'institution-123',
    );
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
            data: { purchaseState: 0, productId: 'report_unlock_v2' },
          }),
          consume: jest.fn(),
        },
      },
    } as any;

    const mockSessionsMutationService = service[
      'sessionsMutationService'
    ] as jest.Mocked<SessionsMutationService>;
    (
      mockSessionsMutationService.unlockReportEntitlement as jest.Mock
    ).mockResolvedValue({});

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

  it.each([401, 403, 404, 429, 500, 503])(
    'maps Google Play provider status %s to a safe unavailable response',
    async (status) => {
      const token = 'purchase-token-must-not-be-logged';
      const email = 'patient@example.com';
      const privateKey = 'private-key-must-not-be-logged';
      const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const fixture = createVerificationFixture({
        providerError: {
          response: {
            status,
            data: {
              error: {
                status: 'PERMISSION_DENIED',
                code: status,
                message: `provider detail ${token} ${email} ${privateKey}`,
              },
            },
          },
        },
      });

      await expect(fixture.verify(token, email)).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'GOOGLE_PLAY_VERIFICATION_UNAVAILABLE',
        }),
      });
      expect(logger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'google_play_purchase_verification_failed',
          action: 'verify_google_play_purchase',
          sessionId: 'session-123',
          productId: 'report_unlock_v2',
          providerStatus: status,
          providerReason: 'PERMISSION_DENIED',
          providerCode: status,
        }),
      );
      expect(JSON.stringify(logger.mock.calls)).not.toContain(token);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(email);
      expect(JSON.stringify(logger.mock.calls)).not.toContain(privateKey);
      logger.mockRestore();
    },
  );

  it.each([
    new BadRequestException('Session report is not eligible for unlock'),
    new ConflictException('Entitlement conflict'),
    new NotFoundException('Session not found'),
  ])('preserves explicit client exceptions', async (error) => {
    const fixture = createVerificationFixture({ queryError: error });

    await expect(fixture.verify()).rejects.toBe(error);
  });

  it('unlocks a valid Google Play purchase', async () => {
    const fixture = createVerificationFixture();

    await expect(fixture.verify()).resolves.toEqual({
      success: true,
      valid: true,
    });
    expect(fixture.unlockReportEntitlement).toHaveBeenCalledWith(
      'session-123',
      'purchase-token',
      {
        providerProductId: 'report_unlock_v2',
        expectedSku: 'report_unlock_v2',
      },
    );
  });
});

function createVerificationFixture(
  options: {
    providerError?: unknown;
    queryError?: Error;
  } = {},
) {
  const unlockReportEntitlement = jest.fn().mockResolvedValue(undefined);
  const publisher = {
    purchases: {
      products: {
        get: options.providerError
          ? jest.fn().mockRejectedValue(options.providerError)
          : jest.fn().mockResolvedValue({
              data: { purchaseState: 0, productId: 'report_unlock_v2' },
            }),
      },
    },
  };
  const service = new PaymentsService(
    {
      findOneForPaymentUnlock: options.queryError
        ? jest.fn().mockRejectedValue(options.queryError)
        : jest.fn().mockResolvedValue({
            id: 'session-123',
            results: [{}],
            expectedReportSku: 'report_unlock_v2',
            paymentStatus: SessionPaymentStatus.PENDING,
          }),
      findByPaymentToken: jest.fn().mockResolvedValue(null),
    } as never,
    { resolveFirebasePatient: jest.fn() } as never,
    { unlockReportEntitlement } as never,
    {
      getReportUnlockSku: jest.fn().mockReturnValue('report_unlock_v2'),
      getPackageName: jest.fn().mockReturnValue('com.akit.mobile'),
      getAndroidPublisher: jest.fn().mockResolvedValue(publisher),
    } as never,
    { manager: { find: jest.fn(), count: jest.fn() } } as never,
  );

  return {
    unlockReportEntitlement,
    verify: (purchaseToken = 'purchase-token', email = 'patient@example.com') =>
      service.verifyGooglePlayPurchase(
        {
          sessionId: 'session-123',
          productId: 'report_unlock_v2',
          purchaseToken,
        },
        {
          userId: 'b3d6d89b-8f58-4fb1-aef5-3f0196c6c936',
          email,
          institutionId: 'institution-123',
        },
      ),
  };
}
