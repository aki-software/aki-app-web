import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingPlan } from '../entities/pricing-plan.entity';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity';
import { CheckoutAttempt } from '../entities/checkout-attempt.entity';
import { PaymentEvent } from '../entities/payment-event.entity';
import { ExchangeRateService } from './exchange-rate.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const INSTITUTION_ID = '22222222-2222-4222-8222-222222222222';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mpAdapter: { createCheckout: jest.Mock };
  let stripeAdapter: { createCheckout: jest.Mock };
  let attempts: Record<string, unknown>[];
  let batches: Record<string, unknown>[];
  let attemptRepository: {
    create: jest.Mock;
    findOneBy: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let pricingPlanRepository: { findOneBy: jest.Mock };
  let savedEntityTypes: unknown[];

  beforeEach(async () => {
    process.env.PAYMENT_IDEMPOTENCY_SECRET = 'a'.repeat(32);
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.API_URL = 'https://api.example.com';
    attempts = [];
    batches = [];
    savedEntityTypes = [];
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
    const entityTypes = new WeakMap<object, unknown>();
    const manager = {
      create: jest.fn((entityType: unknown, value: Record<string, unknown>) => {
        entityTypes.set(value, entityType);
        return value;
      }),
      save: jest.fn(
        (entityOrValue: unknown, partial?: Record<string, unknown>) => {
          const value = partial ?? (entityOrValue as Record<string, unknown>);
          const entityType =
            typeof entityOrValue === 'function'
              ? entityOrValue
              : entityTypes.get(value);
          savedEntityTypes.push(entityType);
          const collection =
            entityType === CheckoutAttempt ? attempts : batches;
          const existing = collection.find((item) => item.id === value.id);
          if (existing) Object.assign(existing, value);
          else collection.push(value);
          return Promise.resolve(value);
        },
      ),
    };
    attemptRepository = {
      create: jest.fn((value: Record<string, unknown>) => value),
      findOneBy: jest.fn((where: Record<string, unknown>) =>
        Promise.resolve(
          attempts.find((attempt) =>
            Object.entries(where).every(
              ([key, value]) => attempt[key] === value,
            ),
          ) ?? null,
        ),
      ),
      manager: { transaction: jest.fn((work) => work(manager)) },
    };
    pricingPlanRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: '55555555-5555-4555-8555-555555555555',
        isActive: true,
        priceUsd: '10.00',
        voucherQuantity: 2,
        name: 'Starter',
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PAYMENT_GATEWAY_MP, useValue: mpAdapter },
        { provide: PAYMENT_GATEWAY_STRIPE, useValue: stripeAdapter },
        {
          provide: getRepositoryToken(PricingPlan),
          useValue: pricingPlanRepository,
        },
        {
          provide: getRepositoryToken(VoucherBatch),
          useValue: { create: jest.fn((value) => value) },
        },
        {
          provide: getRepositoryToken(CheckoutAttempt),
          useValue: attemptRepository,
        },
        {
          provide: ExchangeRateService,
          useValue: {
            getUsdToArsQuote: jest.fn().mockResolvedValue({
              rate: '1500',
              quotedAt: new Date('2026-03-20T12:00:00.000Z'),
              source: 'DOLARAPI_BLUE',
            }),
          },
        },
      ],
    }).compile();
    service = module.get(CheckoutService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates an exact Stripe COMPLETE USD snapshot and persists only derived idempotency values before provider I/O', async () => {
    const response = await service.initiateCheckout({
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'STRIPE',
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'raw-client-key',
    });
    expect(response).toEqual({
      checkoutUrl: 'https://checkout.example/stripe',
      voucherBatchId: expect.any(String),
      checkoutAttemptId: expect.any(String),
    });
    expect(attempts[0]).toEqual(
      expect.objectContaining({
        clientKeyDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        providerIdempotencyKey: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        commercialSnapshot: {
          kind: 'COMPLETE',
          pricingPlanId: '55555555-5555-4555-8555-555555555555',
          planName: 'Starter',
          voucherQuantity: 2,
          listedUsd: { amountMinor: '1000', currency: 'USD' },
          charged: { amountMinor: '1000', currency: 'USD' },
          gateway: 'STRIPE',
        },
      }),
    );
    expect(JSON.stringify({ attempts, batches })).not.toContain(
      'raw-client-key',
    );
    expect(batches[0]).toEqual(
      expect.objectContaining({
        id: response.voucherBatchId,
        idempotencyKey: null,
        expectedAmountMinor: '1000',
      }),
    );
    expect(attempts[0].id).toBe(response.checkoutAttemptId);
    expect(stripeAdapter.createCheckout).toHaveBeenCalledTimes(1);
  });

  it('creates an exact Mercado Pago USD/ARS snapshot with quote metadata', async () => {
    await service.initiateCheckout({
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'MERCADO_PAGO',
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'mp-key',
    });
    expect(attempts[0].commercialSnapshot).toEqual({
      kind: 'COMPLETE',
      pricingPlanId: '55555555-5555-4555-8555-555555555555',
      planName: 'Starter',
      voucherQuantity: 2,
      listedUsd: { amountMinor: '1000', currency: 'USD' },
      charged: { amountMinor: '1500000', currency: 'ARS' },
      gateway: 'MERCADO_PAGO',
      fxRate: '1500',
      fxQuotedAt: '2026-03-20T12:00:00.000Z',
      fxSource: 'DOLARAPI_BLUE',
    });
    expect(mpAdapter.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ priceUsd: 10, priceArs: 15000 }),
    );
  });

  it('returns a READY attempt for the same digest without another provider call', async () => {
    const request = {
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'STRIPE' as const,
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'retry-key',
    };
    const first = await service.initiateCheckout(request);
    const second = await service.initiateCheckout(request);
    expect(second).toEqual(first);
    expect(stripeAdapter.createCheckout).toHaveBeenCalledTimes(1);
  });

  it('rejects changed plan, gateway, or immutable terms for the same key without another provider call', async () => {
    const request = {
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'STRIPE' as const,
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'conflict-key',
    };
    await service.initiateCheckout(request);
    pricingPlanRepository.findOneBy.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      isActive: true,
      priceUsd: '10.00',
      voucherQuantity: 2,
      name: 'Changed plan',
    });

    for (const changedRequest of [
      { ...request, planId: '66666666-6666-4666-8666-666666666666' },
      { ...request, gateway: 'MERCADO_PAGO' as const },
      { ...request, successUrl: 'https://app.example.com/billing/changed' },
    ]) {
      await expect(service.initiateCheckout(changedRequest)).rejects.toEqual(
        expect.objectContaining<Partial<ConflictException>>({
          message: 'Checkout request conflicts with an existing attempt',
        }),
      );
    }
    expect(stripeAdapter.createCheckout).toHaveBeenCalledTimes(1);
    expect(mpAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it('returns the same non-disclosing 404 for foreign and unknown explicit attempts and rejects wrong digest or terms', async () => {
    const request = {
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'STRIPE' as const,
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'explicit-key',
    };
    const created = await service.initiateCheckout(request);
    const captureNotFound = async (
      params: Parameters<CheckoutService['initiateCheckout']>[0],
    ) => {
      try {
        await service.initiateCheckout(params);
        throw new Error('Expected checkout attempt lookup to fail');
      } catch (error) {
        return error as NotFoundException;
      }
    };
    const foreign = await captureNotFound({
      ...request,
      userId: '77777777-7777-4777-8777-777777777777',
      checkoutAttemptId: created.checkoutAttemptId,
    });
    const unknown = await captureNotFound({
      ...request,
      checkoutAttemptId: '88888888-8888-4888-8888-888888888888',
    });
    expect(foreign.getStatus()).toBe(404);
    expect(foreign.getResponse()).toEqual(unknown.getResponse());
    await expect(
      service.initiateCheckout({
        ...request,
        checkoutAttemptId: created.checkoutAttemptId,
        idempotencyKey: 'wrong-key',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.initiateCheckout({
        ...request,
        checkoutAttemptId: created.checkoutAttemptId,
        failureUrl: 'https://app.example.com/billing/changed',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripeAdapter.createCheckout).toHaveBeenCalledTimes(1);
  });

  it('uses manager transactions to save only checkout attempts and voucher batches', async () => {
    await service.initiateCheckout({
      planId: '55555555-5555-4555-8555-555555555555',
      gateway: 'STRIPE',
      userId: USER_ID,
      institutionId: INSTITUTION_ID,
      buyerEmail: 'buyer@example.com',
      idempotencyKey: 'transaction-key',
    });
    expect(savedEntityTypes).toEqual(
      expect.arrayContaining([VoucherBatch, CheckoutAttempt]),
    );
    expect(savedEntityTypes).not.toContain(PaymentEvent);
    expect(
      savedEntityTypes.every(
        (type) => type === VoucherBatch || type === CheckoutAttempt,
      ),
    ).toBe(true);
  });

  it('marks both persisted records FAILED when provider creation fails', async () => {
    stripeAdapter.createCheckout.mockRejectedValueOnce(
      new Error('provider unavailable'),
    );
    await expect(
      service.initiateCheckout({
        planId: '55555555-5555-4555-8555-555555555555',
        gateway: 'STRIPE',
        userId: USER_ID,
        institutionId: INSTITUTION_ID,
        buyerEmail: 'buyer@example.com',
        idempotencyKey: 'failure-key',
      }),
    ).rejects.toThrow('provider unavailable');
    expect(attempts[0]).toEqual(expect.objectContaining({ state: 'FAILED' }));
    expect(batches[0]).toEqual(expect.objectContaining({ status: 'FAILED' }));
  });
});
