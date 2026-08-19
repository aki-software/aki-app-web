import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { validate } from 'class-validator';
import { UserRole } from '@akit/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GooglePlayPatientGuard } from '../auth/guards/google-play-patient.guard.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { CheckoutRequestDto } from './dto/checkout-request.dto.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { resolvePaymentConfiguration } from './config/payment-configuration.js';

const CANONICAL_REPORT_SKU = 'report_unlock_v2';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const INSTITUTION_ID = '33333333-3333-4333-8333-333333333333';
const initialEnvironment = { ...process.env };

describe('Payments security refactor phase 2 RED', () => {
  afterEach(() => {
    process.env = { ...initialEnvironment };
  });

  it('rejects checkout and Play DTO values outside bounded formats and gateway enum', async () => {
    const checkoutErrors = await validate(
      Object.assign(new CheckoutRequestDto(), {
        planId: 'x'.repeat(129),
        gateway: 'UNTRUSTED_GATEWAY',
        successUrl: 'http://attacker.example/complete',
        failureUrl: 'not-a-url',
      }),
    );
    const playErrors = await validate(
      Object.assign(new VerifyPlayPurchaseDto(), {
        sessionId: 'not-a-uuid',
        productId: 'x'.repeat(129),
        purchaseToken: 'x'.repeat(2049),
      }),
    );

    expect(checkoutErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['planId', 'gateway', 'successUrl', 'failureUrl']),
    );
    expect(playErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['sessionId', 'productId', 'purchaseToken']),
    );
  });

  it('requires a bounded idempotency key before creating a checkout batch', async () => {
    const fixture = createCheckoutFixture();

    await expect(
      fixture.service.initiateCheckout({
        planId: 'plan-1',
        gateway: 'STRIPE',
        institutionId: INSTITUTION_ID,
        buyerEmail: 'billing@akit.example',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.createdBatches).toHaveLength(0);
    expect(fixture.gateway.createCheckout).not.toHaveBeenCalled();
  });

  it('uses configured HTTPS origins rather than client-provided redirect URLs', async () => {
    const fixture = createCheckoutFixture();

    await fixture.service.initiateCheckout({
      planId: 'plan-1',
      gateway: 'STRIPE',
      institutionId: INSTITUTION_ID,
      buyerEmail: 'billing@akit.example',
      successUrl: 'https://attacker.example/complete',
      failureUrl: 'https://attacker.example/fail',
      idempotencyKey: 'checkout-origin-1',
    } as never);

    expect(fixture.gateway.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: expect.stringMatching(/^https:\/\/app.akit.example\//),
        failureUrl: expect.stringMatching(/^https:\/\/app.akit.example\//),
      }),
    );
  });

  it('reuses one checkout and batch for the same institution idempotency key', async () => {
    const fixture = createCheckoutFixture();
    const request = {
      planId: 'plan-1',
      gateway: 'STRIPE' as const,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'billing@akit.example',
      idempotencyKey: 'checkout-retry-1',
    };

    const first = await fixture.service.initiateCheckout(request as never);
    const second = await fixture.service.initiateCheckout(request as never);

    expect(second).toEqual(first);
    expect(fixture.createdBatches).toHaveLength(1);
    expect(fixture.gateway.createCheckout).toHaveBeenCalledTimes(1);
  });

  it('persists immutable server-derived minor amount and currency expectations', async () => {
    const fixture = createCheckoutFixture();

    await fixture.service.initiateCheckout({
      planId: 'plan-1',
      gateway: 'STRIPE',
      institutionId: INSTITUTION_ID,
      buyerEmail: 'billing@akit.example',
      idempotencyKey: 'checkout-expectation-1',
    } as never);

    expect(fixture.createdBatches[0]).toEqual(
      expect.objectContaining({
        expectedAmountMinor: '1250',
        currency: 'USD',
      }),
    );
  });

  it('compensates a persisted batch to FAILED when gateway checkout creation fails', async () => {
    const fixture = createCheckoutFixture({ gatewayFailure: true });

    await expect(
      fixture.service.initiateCheckout({
        planId: 'plan-1',
        gateway: 'STRIPE',
        institutionId: INSTITUTION_ID,
        buyerEmail: 'billing@akit.example',
        idempotencyKey: 'checkout-failure-1',
      } as never),
    ).rejects.toThrow('gateway unavailable');

    expect(fixture.createdBatches[0]).toEqual(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('propagates the authenticated userId from the Play controller to its service', async () => {
    const verifyGooglePlayPurchase = jest
      .fn()
      .mockResolvedValue({ success: true, valid: true });
    const controller = new PaymentsController(
      { verifyGooglePlayPurchase } as never,
      {} as never,
      {} as never,
    );
    const dto = validPlayDto();
    const request = {
      user: { userId: PATIENT_ID, institutionId: INSTITUTION_ID },
    };

    await controller.verifyGooglePlay(dto, request as never);

    expect(verifyGooglePlayPurchase).toHaveBeenCalledWith(dto, {
      userId: PATIENT_ID,
      institutionId: INSTITUTION_ID,
    });
  });

  it('protects Play verification with JwtAuthGuard and no nonexistent PATIENT role metadata', () => {
    const handler = PaymentsController.prototype.verifyGooglePlay;

    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    expect(guards).toEqual(
      expect.arrayContaining([
        JwtAuthGuard,
        GooglePlayPatientGuard,
        RateLimitGuard,
      ]),
    );
    expect(guards).toHaveLength(3);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
    expect(Object.values(UserRole)).not.toContain('PATIENT');
  });

  it.each([
    [
      'a foreign patient session',
      {
        patientId: 'foreign-patient',
        institutionId: INSTITUTION_ID,
        results: [{}],
      },
    ],
    [
      'a cross-tenant session',
      {
        patientId: PATIENT_ID,
        institutionId: 'foreign-institution',
        results: [{}],
      },
    ],
    [
      'an incomplete session without session_results',
      { patientId: PATIENT_ID, institutionId: INSTITUTION_ID, results: [] },
    ],
  ])('rejects %s before Google Play is called', async (_label, session) => {
    const fixture = createPlayFixture(session);

    await expect(fixture.verify(validPlayDto())).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(fixture.publisher.purchases.products.get).not.toHaveBeenCalled();
    expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('requires the configured canonical SKU in both the request and provider response', async () => {
    const fixture = createPlayFixture(
      { patientId: PATIENT_ID, institutionId: INSTITUTION_ID, results: [{}] },
      { productId: 'wrong_provider_sku' },
    );

    await expect(
      fixture.verify({ ...validPlayDto(), productId: 'client_supplied_sku' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.publisher.purchases.products.get).not.toHaveBeenCalled();
    expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it.each([1, 2])(
    'does not grant an entitlement for non-approved Google state %s',
    async (purchaseState) => {
      const fixture = createPlayFixture(
        { patientId: PATIENT_ID, institutionId: INSTITUTION_ID, results: [{}] },
        { purchaseState },
      );

      const result = await fixture.verify(validPlayDto());

      expect(result).toEqual({
        success: false,
        valid: false,
        reason: 'PURCHASE_NOT_VALID',
      });
      expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
    },
  );

  it('makes an already successful same-session token retry idempotent without Google or another entitlement update', async () => {
    const fixture = createPlayFixture({
      patientId: PATIENT_ID,
      institutionId: INSTITUTION_ID,
      results: [{}],
      paymentReference: 'token-retry',
      paymentStatus: 'PAID',
    });

    const result = await fixture.verify(
      validPlayDto({ purchaseToken: 'token-retry' }),
    );

    expect(result).toEqual({ success: true, valid: true });
    expect(fixture.publisher.purchases.products.get).not.toHaveBeenCalled();
    expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('rejects a token accepted by another session without calling Google', async () => {
    const fixture = createPlayFixture(
      { patientId: PATIENT_ID, institutionId: INSTITUTION_ID, results: [{}] },
      {},
      { id: 'other-session' },
    );

    const result = await fixture.verify(validPlayDto());

    expect(result).toEqual({
      success: false,
      valid: false,
      reason: 'ALREADY_CONSUMED',
    });
    expect(fixture.publisher.purchases.products.get).not.toHaveBeenCalled();
  });

  it('rejects a different token for an already-paid session instead of changing session payment state', async () => {
    const fixture = createPlayFixture({
      patientId: PATIENT_ID,
      institutionId: INSTITUTION_ID,
      results: [{}],
      paymentReference: 'original-token',
      paymentStatus: 'PAID',
    });

    await expect(
      fixture.verify(validPlayDto({ purchaseToken: 'different-token' })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('unlocks only the report and never changes session payment or voucher fulfillment', async () => {
    const fixture = createPlayFixture({
      patientId: PATIENT_ID,
      institutionId: INSTITUTION_ID,
      results: [{}],
    });

    await fixture.verify(validPlayDto());

    expect(fixture.mutations.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('uses the canonical GOOGLE_PLAY_REPORT_SKU and rejects a non-canonical production SKU', () => {
    expect(() =>
      resolvePaymentConfiguration(
        validProductionEnvironment({
          GOOGLE_PLAY_REPORT_SKU: 'legacy_report_unlock',
        }),
      ),
    ).toThrow('GOOGLE_PLAY_REPORT_SKU');
    expect(() =>
      resolvePaymentConfiguration(validProductionEnvironment()),
    ).not.toThrow();
  });

  it('reads a safe GOOGLE_PLAY_PACKAGE_NAME and rejects unsafe package names', () => {
    const safeAdapter = new GooglePlayAdapter({
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'GOOGLE_PLAY_PACKAGE_NAME' ? 'com.akit.mobile' : undefined,
        ),
    } as never);
    const unsafeAdapter = new GooglePlayAdapter({
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'GOOGLE_PLAY_PACKAGE_NAME' ? '../com.akit.mobile' : undefined,
        ),
    } as never);

    expect(safeAdapter.getPackageName()).toBe('com.akit.mobile');
    expect(() => unsafeAdapter.getPackageName()).toThrow();
  });
});

function createCheckoutFixture(options: { gatewayFailure?: boolean } = {}) {
  const createdBatches: Array<Record<string, unknown>> = [];
  const gateway = {
    createCheckout: options.gatewayFailure
      ? jest.fn().mockRejectedValue(new Error('gateway unavailable'))
      : jest.fn().mockResolvedValue({
          checkoutUrl: 'https://gateway.akit.example/checkout',
          externalReference: 'gateway-ref-1',
        }),
  };
  const voucherBatchRepo = {
    create: jest.fn().mockImplementation((batch: Record<string, unknown>) => ({
      ...batch,
      id: `batch-${createdBatches.length + 1}`,
    })),
    save: jest.fn().mockImplementation((batch: Record<string, unknown>) => {
      if (!createdBatches.includes(batch)) createdBatches.push(batch);
      return Promise.resolve(batch);
    }),
    findOneBy: jest
      .fn()
      .mockImplementation((where: Record<string, unknown>) =>
        Promise.resolve(
          createdBatches.find(
            (batch) =>
              batch.ownerInstitutionId === where.ownerInstitutionId &&
              batch.idempotencyKey === where.idempotencyKey,
          ) ?? null,
        ),
      ),
  };
  const service = new CheckoutService(
    {} as never,
    gateway as never,
    {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        priceUsd: '12.50',
        voucherQuantity: 5,
        name: 'Five vouchers',
      }),
    } as never,
    voucherBatchRepo as never,
    { getUsdToArsRate: jest.fn().mockResolvedValue(1000) } as never,
  );

  const environment = process.env;
  process.env = {
    ...environment,
    FRONTEND_URL: 'https://app.akit.example',
    API_URL: 'https://api.akit.example',
  };

  return { service, gateway, createdBatches };
}

function createPlayFixture(
  session: Record<string, unknown>,
  purchase: Record<string, unknown> = {},
  existingSession: Record<string, unknown> | null = null,
) {
  const publisher = {
    purchases: {
      products: {
        get: jest.fn().mockResolvedValue({
          data: {
            purchaseState: 0,
            productId: CANONICAL_REPORT_SKU,
            ...purchase,
          },
        }),
      },
    },
  };
  const mutations = {
    updatePaymentStatus: jest.fn().mockResolvedValue(undefined),
  };
  const scopedSession: Record<string, unknown> = {
    id: SESSION_ID,
    paymentReference: null,
    paymentStatus: 'PENDING',
    expectedReportSku: CANONICAL_REPORT_SKU,
    ...session,
  };
  const service = new PaymentsService(
    {
      findOne: jest.fn().mockResolvedValue(scopedSession),
      findOneForPaymentUnlock: jest
        .fn()
        .mockImplementation(
          (_id: string, patientId: string, institutionId: string) => {
            if (
              scopedSession.patientId !== patientId ||
              scopedSession.institutionId !== institutionId
            ) {
              return Promise.reject(
                new BadRequestException('Session is not eligible'),
              );
            }
            return Promise.resolve(scopedSession);
          },
        ),
      findByPaymentToken: jest.fn().mockResolvedValue(existingSession),
    } as never,
    {
      resolveFirebaseUser: jest.fn().mockResolvedValue({ id: PATIENT_ID }),
    } as never,
    {
      ...mutations,
      unlockReportEntitlement: jest.fn().mockResolvedValue(undefined),
    } as never,
    {
      getPackageName: jest.fn().mockReturnValue('com.akit.mobile'),
      getAndroidPublisher: jest.fn().mockResolvedValue(publisher),
      getReportUnlockSku: jest.fn().mockReturnValue(CANONICAL_REPORT_SKU),
    } as never,
    { manager: { find: jest.fn(), count: jest.fn() } } as never,
  );
  const verify = (dto: VerifyPlayPurchaseDto) =>
    (
      service.verifyGooglePlayPurchase as unknown as (
        request: VerifyPlayPurchaseDto,
        principal: { userId: string; institutionId: string },
      ) => Promise<{ success: boolean; valid: boolean; reason?: string }>
    )(dto, {
      userId: PATIENT_ID,
      institutionId: INSTITUTION_ID,
    });

  return { verify, publisher, mutations };
}

function validPlayDto(
  overrides: Partial<VerifyPlayPurchaseDto> = {},
): VerifyPlayPurchaseDto {
  return {
    sessionId: SESSION_ID,
    productId: CANONICAL_REPORT_SKU,
    purchaseToken: 'purchase-token-1234567890',
    ...overrides,
  };
}

function validProductionEnvironment(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.akit.example',
    API_URL: 'https://api.akit.example',
    REDIS_HOST: 'redis.akit.example',
    STRIPE_SECRET_KEY: 'sk_live_1234567890abcdef',
    STRIPE_WEBHOOK_SECRET: 'whsec_1234567890abcdef',
    MP_ACCESS_TOKEN: 'APP_USR-1234567890abcdef',
    MP_WEBHOOK_SECRET: '1234567890abcdefghij',
    GOOGLE_PLAY_PACKAGE_NAME: 'com.akit.mobile',
    GOOGLE_PLAY_REPORT_SKU: CANONICAL_REPORT_SKU,
    GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64: 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=',
    ...overrides,
  };
}
