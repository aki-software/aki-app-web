import { BadRequestException } from '@nestjs/common';
import { GooglePlayPatientGuard } from '../auth/guards/google-play-patient.guard.js';
import { SessionReportSkuExpectation1787000000002 } from '../migrations/1787000000002-SessionReportSkuExpectation.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';

describe('Phase 2 review remediation', () => {
  it('rejects an ambiguous repeated raw idempotency header before checkout reaches the service', async () => {
    const initiateCheckout = jest.fn();
    const controller = new PaymentsController(
      {} as never,
      { initiateCheckout } as never,
      {} as never,
    );

    await expect(
      controller.initiateCheckout(
        { planId: 'plan-1', gateway: 'STRIPE' },
        {
          user: {
            id: 'admin-1',
            userId: 'admin-1',
            email: 'admin@akit.example',
            institutionId: 'tenant-1',
            role: 'INSTITUTION_ADMIN',
          },
          rawHeaders: [
            'X-Idempotency-Key',
            'first-key',
            'x-idempotency-key',
            'second-key',
          ],
        } as never,
        'first-key, second-key',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(initiateCheckout).not.toHaveBeenCalled();
  });

  it('rejects an already voucher-unlocked report before Google is called', async () => {
    const publisher = { purchases: { products: { get: jest.fn() } } };
    const service = new PaymentsService(
      {
        findOneForPaymentUnlock: jest.fn().mockResolvedValue({
          id: 'session-1',
          patientId: 'patient-1',
          institutionId: 'tenant-1',
          results: [{}],
          reportUnlockedAt: new Date(),
          expectedReportSku: 'report_unlock_v2',
          paymentStatus: 'VOUCHER_REDEEMED',
        }),
        findByPaymentToken: jest.fn(),
      } as never,
      {
        resolveFirebaseUser: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      } as never,
      { unlockReportEntitlement: jest.fn() } as never,
      {
        getReportUnlockSku: jest.fn().mockReturnValue('report_unlock_v2'),
        getPackageName: jest.fn(),
        getAndroidPublisher: jest.fn().mockResolvedValue(publisher),
      } as never,
      { manager: { find: jest.fn(), count: jest.fn() } } as never,
    );

    await expect(
      service.verifyGooglePlayPurchase(
        {
          sessionId: 'session-1',
          productId: 'report_unlock_v2',
          purchaseToken: 'new-token-1234',
        },
        {
          userId: 'patient-1',
          email: 'patient@akit.example',
          institutionId: 'tenant-1',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(publisher.purchases.products.get).not.toHaveBeenCalled();
  });

  it('rejects a provider product mismatch without writing an entitlement', async () => {
    const unlockReportEntitlement = jest.fn();
    const service = new PaymentsService(
      {
        findOneForPaymentUnlock: jest.fn().mockResolvedValue({
          id: 'session-1',
          patientId: 'patient-1',
          institutionId: 'tenant-1',
          results: [{}],
          expectedReportSku: 'report_unlock_v2',
          paymentStatus: 'PENDING',
        }),
        findByPaymentToken: jest.fn().mockResolvedValue(null),
      } as never,
      {
        resolveFirebaseUser: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      } as never,
      { unlockReportEntitlement } as never,
      {
        getReportUnlockSku: jest.fn().mockReturnValue('report_unlock_v2'),
        getPackageName: jest.fn().mockReturnValue('com.akit.mobile'),
        getAndroidPublisher: jest.fn().mockResolvedValue({
          purchases: {
            products: {
              get: jest.fn().mockResolvedValue({
                data: { purchaseState: 0, productId: 'wrong_sku' },
              }),
            },
          },
        }),
      } as never,
      { manager: { find: jest.fn(), count: jest.fn() } } as never,
    );

    await expect(
      service.verifyGooglePlayPurchase(
        {
          sessionId: 'session-1',
          productId: 'report_unlock_v2',
          purchaseToken: 'token-1234',
        },
        {
          userId: 'patient-1',
          email: 'patient@akit.example',
          institutionId: 'tenant-1',
        },
      ),
    ).resolves.toEqual({
      success: false,
      valid: false,
      reason: 'PURCHASE_NOT_VALID',
    });
    expect(unlockReportEntitlement).not.toHaveBeenCalled();
  });

  it('writes one report-only entitlement with the authoritative session, token, provider SKU, and persisted expectation', async () => {
    const unlockReportEntitlement = jest.fn().mockResolvedValue(undefined);
    const service = new PaymentsService(
      {
        findOneForPaymentUnlock: jest.fn().mockResolvedValue({
          id: 'authoritative-session',
          patientId: 'patient-1',
          institutionId: 'tenant-1',
          results: [{}],
          expectedReportSku: 'report_unlock_v2',
          paymentStatus: 'PENDING',
        }),
        findByPaymentToken: jest.fn().mockResolvedValue(null),
      } as never,
      {
        resolveFirebaseUser: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      } as never,
      { unlockReportEntitlement, updatePaymentStatus: jest.fn() } as never,
      {
        getReportUnlockSku: jest.fn().mockReturnValue('report_unlock_v2'),
        getPackageName: jest.fn().mockReturnValue('com.akit.mobile'),
        getAndroidPublisher: jest.fn().mockResolvedValue({
          purchases: {
            products: {
              get: jest.fn().mockResolvedValue({
                data: { purchaseState: 0, productId: 'report_unlock_v2' },
              }),
            },
          },
        }),
      } as never,
      { manager: { find: jest.fn(), count: jest.fn() } } as never,
    );

    await expect(
      service.verifyGooglePlayPurchase(
        {
          sessionId: 'client-session',
          productId: 'report_unlock_v2',
          purchaseToken: 'provider-token-1234',
        },
        {
          userId: 'patient-1',
          email: 'patient@akit.example',
          institutionId: 'tenant-1',
        },
      ),
    ).resolves.toEqual({ success: true, valid: true });
    expect(unlockReportEntitlement).toHaveBeenCalledTimes(1);
    expect(unlockReportEntitlement).toHaveBeenCalledWith(
      'authoritative-session',
      'provider-token-1234',
      {
        providerProductId: 'report_unlock_v2',
        expectedSku: 'report_unlock_v2',
      },
    );
  });

  it('accepts only Firebase synthetic PATIENT principals for Google Play', () => {
    const guard = new GooglePlayPatientGuard();
    const context = (user: unknown) => ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    });

    expect(
      guard.canActivate(
        context({ userId: 'patient-1', role: 'PATIENT' }) as never,
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        context({ userId: 'staff-1', role: 'THERAPIST' }) as never,
      ),
    ).toThrow();
  });

  it('adds and safely backfills the persisted report SKU expectation', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new SessionReportSkuExpectation1787000000002();

    await migration.up({ query } as never);
    await migration.down();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('expected_report_sku'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('session_results'),
    );
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('does not persist a PENDING batch when checkout URL configuration is invalid', async () => {
    const save = jest.fn();
    const service = new CheckoutService(
      {} as never,
      { createCheckout: jest.fn() } as never,
      { findOneBy: jest.fn() } as never,
      { create: jest.fn(), save, findOneBy: jest.fn() } as never,
      { getUsdToArsRate: jest.fn() } as never,
    );
    const originalFrontendUrl = process.env.FRONTEND_URL;
    const originalApiUrl = process.env.API_URL;
    process.env.FRONTEND_URL = 'http://invalid.example';
    process.env.API_URL = 'https://api.akit.example';

    await expect(
      service.initiateCheckout({
        planId: 'plan-1',
        gateway: 'STRIPE',
        institutionId: 'tenant-1',
        buyerEmail: 'billing@akit.example',
        idempotencyKey: 'key-12345678',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();

    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.API_URL = originalApiUrl;
  });
});
