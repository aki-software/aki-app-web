import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac } from 'node:crypto';
import { DataSource } from 'typeorm';
import { MercadoPagoAdapter } from './adapters/mercadopago.adapter.js';
import { StripeAdapter } from './adapters/stripe.adapter.js';
import { PaymentFulfillmentOutbox } from './entities/payment-fulfillment-outbox.entity.js';
import {
  type PaymentGatewayAdapter,
  type VerifiedPayment,
} from './interfaces/payment-gateway.adapter.js';
import { WebhookController } from './webhook.controller.js';
import { PaymentsController } from './payments.controller.js';
import { WebhookProcessorService } from './services/webhook-processor.service.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { VoucherBatchStatus } from '../vouchers/entities/voucher.enums.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';

const RAW_STRIPE_PAYLOAD = Buffer.from(
  '{"data":{"object":{"id":"cs_exact"}},"type":"checkout.session.completed"}',
);
const MP_SECRET = 'mp-webhook-secret-for-phase-three-tests';
const MP_REQUEST_ID = 'request-123';
const MP_DATA_ID = 'payment-123';

describe('payments security refactor phase 3 RED', () => {
  it('requires a Buffer raw body before forwarding a webhook', async () => {
    const processWebhook = jest.fn().mockResolvedValue(undefined);
    const controller = new WebhookController({ processWebhook } as never);

    await expect(
      controller.handleWebhook('stripe', { body: { amount: 1000 } } as never, {
        'stripe-signature': 'signature',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processWebhook).not.toHaveBeenCalled();
  });

  it('keeps ordinary JSON checkout route bodies parseable while raw webhook capture is enabled', async () => {
    const initiateCheckout = jest
      .fn()
      .mockResolvedValue({ checkoutUrl: 'https://pay.akit.example' });
    const controller = new PaymentsController(
      {} as never,
      { initiateCheckout } as never,
      {} as never,
    );
    const body = { planId: 'plan-1', gateway: 'STRIPE' };

    await controller.initiateCheckout(
      body as never,
      {
        user: { institutionId: 'institution-1', email: 'buyer@akit.example' },
        rawHeaders: ['x-idempotency-key', 'checkout-key-1'],
      } as never,
      'checkout-key-1',
    );

    expect(initiateCheckout).toHaveBeenCalledWith({
      ...body,
      institutionId: 'institution-1',
      buyerEmail: 'buyer@akit.example',
      idempotencyKey: 'checkout-key-1',
    });
  });

  it('accepts only allowlisted gateway names and forwards exact Buffer bytes without serializing them', async () => {
    const processWebhook = jest.fn().mockResolvedValue(undefined);
    const controller = new WebhookController({ processWebhook } as never);

    await controller.handleWebhook(
      'stripe',
      { rawBody: RAW_STRIPE_PAYLOAD, body: { ignored: true } } as never,
      { 'stripe-signature': 'signature' },
    );

    expect(processWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'STRIPE',
        rawBody: RAW_STRIPE_PAYLOAD,
      }),
    );
    await expect(
      controller.handleWebhook(
        'unknown',
        { rawBody: RAW_STRIPE_PAYLOAD } as never,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects Stripe validation when the signed payload is not the exact raw Buffer', async () => {
    const adapter = new StripeAdapter(
      config({
        STRIPE_SECRET_KEY: 'sk_test_phase3',
        STRIPE_WEBHOOK_SECRET: 'whsec_phase3',
      }),
    );
    const constructEvent = jest.fn().mockReturnValue({ id: 'evt_1' });
    (
      adapter as unknown as {
        stripe: { webhooks: { constructEvent: jest.Mock } };
      }
    ).stripe = {
      webhooks: { constructEvent },
    };

    await expect(
      adapter.validateWebhook(
        JSON.stringify(JSON.parse(RAW_STRIPE_PAYLOAD.toString())) as never,
        {
          'stripe-signature': 't=1,v1=test',
        },
      ),
    ).resolves.toBe(false);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('fails closed for malformed Stripe signatures and stale timestamps', async () => {
    const adapter = new StripeAdapter(
      config({
        STRIPE_SECRET_KEY: 'sk_test_phase3',
        STRIPE_WEBHOOK_SECRET: 'whsec_phase3',
      }),
    );
    const constructEvent = jest.fn().mockImplementation(() => {
      throw new Error('signature verification failed');
    });
    (
      adapter as unknown as {
        stripe: { webhooks: { constructEvent: jest.Mock } };
      }
    ).stripe = {
      webhooks: { constructEvent },
    };

    await expect(
      adapter.validateWebhook(RAW_STRIPE_PAYLOAD, {
        'stripe-signature': 'malformed',
      }),
    ).resolves.toBe(false);
    await expect(
      adapter.validateWebhook(RAW_STRIPE_PAYLOAD, {
        'stripe-signature': 't=1,v1=stale',
      }),
    ).resolves.toBe(false);
  });

  it('requires Mercado Pago signature configuration at adapter construction', () => {
    expect(
      () =>
        new MercadoPagoAdapter(config({ MP_ACCESS_TOKEN: 'APP_USR-phase3' })),
    ).toThrow('MP_WEBHOOK_SECRET');
  });

  it('uses Mercado Pago v1 x-signature semantics with query data.id and a 300-second tolerance', async () => {
    const timestamp = String(Date.now());
    const manifest = `id:${MP_DATA_ID};request-id:${MP_REQUEST_ID};ts:${timestamp};`;
    const signature = createHmac('sha256', MP_SECRET)
      .update(manifest)
      .digest('hex');
    const processWebhook = jest.fn().mockResolvedValue(undefined);
    const controller = new WebhookController({ processWebhook } as never);

    await controller.handleWebhook(
      'mercado_pago',
      {
        rawBody: Buffer.from('{"data":{"id":"body-controlled-id"}}'),
        body: { data: { id: 'body-controlled-id' } },
        query: { 'data.id': MP_DATA_ID },
      } as never,
      {
        'x-signature': `ts=${timestamp},v1=${signature}`,
        'x-request-id': MP_REQUEST_ID,
      },
    );

    expect(processWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'MERCADO_PAGO',
        query: { 'data.id': MP_DATA_ID },
      }),
    );
  });

  it.each([
    ['missing signature', undefined],
    ['malformed signature', 'ts=not-a-timestamp,v1=bad'],
    ['unsupported signature version', `ts=${Date.now()},v2=bad`],
    ['stale timestamp', `ts=${Date.now() - 301_000},v1=bad`],
  ])('rejects Mercado Pago %s fail-closed', async (_label, signature) => {
    const adapter = new MercadoPagoAdapter(
      config({
        MP_ACCESS_TOKEN: 'APP_USR-phase3',
        MP_WEBHOOK_SECRET: MP_SECRET,
      }),
    );

    await expect(
      adapter.validateWebhook(Buffer.from('{}'), {
        ...(signature ? { 'x-signature': signature } : {}),
        'x-request-id': MP_REQUEST_ID,
        'data.id': MP_DATA_ID,
      }),
    ).resolves.toBe(false);
  });

  it('rejects a Mercado Pago HMAC mismatch without treating request body fields as signed authority', async () => {
    const adapter = new MercadoPagoAdapter(
      config({
        MP_ACCESS_TOKEN: 'APP_USR-phase3',
        MP_WEBHOOK_SECRET: MP_SECRET,
      }),
    );

    await expect(
      adapter.validateWebhook(
        Buffer.from('{"external_reference":"attacker-batch"}'),
        {
          'x-signature': `ts=${Date.now()},v1=${'0'.repeat(64)}`,
          'x-request-id': MP_REQUEST_ID,
          'data.id': MP_DATA_ID,
        },
      ),
    ).resolves.toBe(false);
  });

  it('rejects unknown provider references instead of silently acknowledging them', async () => {
    const fixture = createProcessorFixture({ batch: null });

    await expect(fixture.process()).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
    expect(fixture.events.emit).not.toHaveBeenCalled();
  });

  it.each([
    ['amount', { amountMinor: 999n }],
    ['currency', { currency: 'ARS' }],
    ['merchant reference', { merchantReference: 'different-batch' }],
    ['provider identity', { batch: { paymentProvider: 'MERCADO_PAGO' } }],
  ])(
    'rejects a provider %s mismatch before settlement',
    async (_label, overrides) => {
      const fixture = createProcessorFixture(overrides);

      await expect(fixture.process()).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
      expect(fixture.transaction.manager.save).not.toHaveBeenCalled();
    },
  );

  it('rejects a legacy batch without an immutable gateway expectation', async () => {
    const fixture = createProcessorFixture({
      batch: { paymentProvider: null },
    });

    await expect(fixture.process()).rejects.toBeInstanceOf(ForbiddenException);
    expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
    expect(fixture.transaction.manager.save).not.toHaveBeenCalled();
  });

  it.each([VoucherBatchStatus.CANCELLED, VoucherBatchStatus.PAID])(
    'rejects approved callbacks for an illegal %s transition',
    async (status) => {
      const fixture = createProcessorFixture({ batch: { status } });

      await expect(fixture.process()).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(fixture.transaction.commitTransaction).not.toHaveBeenCalled();
      expect(fixture.events.emit).not.toHaveBeenCalled();
    },
  );

  it('returns a retryable pending result when the provider is unavailable without settling', async () => {
    const fixture = createProcessorFixture({
      providerError: new Error('ETIMEDOUT'),
    });

    await expect(fixture.process()).resolves.toEqual({
      outcome: 'PENDING_RETRY',
    });
    expect(fixture.transaction.manager.save).not.toHaveBeenCalled();
    expect(fixture.events.emit).not.toHaveBeenCalled();
  });

  it('atomically records an approved settlement as one PAID transition, one digest-only event, and one outbox intent', async () => {
    const fixture = createProcessorFixture();

    await fixture.process();

    expect(fixture.transaction.startTransaction).toHaveBeenCalledWith(
      'SERIALIZABLE',
    );
    expect(fixture.transaction.manager.create).toHaveBeenCalledWith(
      PaymentEvent,
      expect.objectContaining({
        gateway: 'STRIPE',
        externalPaymentId: 'provider-payment-1',
        payloadDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(fixture.transaction.manager.create).toHaveBeenCalledWith(
      PaymentFulfillmentOutbox,
      expect.objectContaining({ voucherBatchId: 'batch-1' }),
    );
    expect(fixture.transaction.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('keeps payment.completed as a compatibility notification strictly after commit, never as transaction authority', async () => {
    const fixture = createProcessorFixture();

    await fixture.process();

    expect(fixture.events.emit).toHaveBeenCalledWith(
      'payment.completed',
      expect.objectContaining({ voucherBatchId: 'batch-1', gateway: 'STRIPE' }),
    );
    expect(
      fixture.transaction.commitTransaction.mock.invocationCallOrder[0],
    ).toBeLessThan(fixture.events.emit.mock.invocationCallOrder[0]);
  });

  it('never emits payment.completed when settlement rolls back', async () => {
    const fixture = createProcessorFixture({
      saveError: new Error('unique violation'),
    });

    await expect(fixture.process()).rejects.toThrow('unique violation');
    expect(fixture.transaction.rollbackTransaction).toHaveBeenCalled();
    expect(fixture.events.emit).not.toHaveBeenCalled();
  });
});

function config(values: Record<string, string | undefined>): ConfigService {
  return { get: jest.fn((key: string) => values[key]) } as never;
}

function createProcessorFixture(
  overrides: {
    amountMinor?: bigint;
    currency?: string;
    merchantReference?: string;
    providerError?: Error;
    saveError?: Error;
    batch?: Record<string, unknown> | null;
  } = {},
) {
  const batch =
    overrides.batch === null
      ? null
      : {
          id: 'batch-1',
          status: VoucherBatchStatus.PENDING,
          expectedAmountMinor: '1000',
          currency: 'USD',
          paymentProvider: 'STRIPE',
          ownerInstitutionId: 'institution-1',
          ownerInstitution: { id: 'institution-1' },
          ownerUser: { email: 'buyer@akit.example' },
          quantity: 2,
          markAsPaid: jest.fn(),
          ...overrides.batch,
        };
  const payment: VerifiedPayment = {
    providerPaymentId: 'provider-payment-1',
    merchantReference: overrides.merchantReference ?? 'batch-1',
    amountMinor: overrides.amountMinor ?? 1000n,
    currency: overrides.currency ?? 'USD',
    status: 'APPROVED',
  };
  const transaction = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === PaymentEvent) return Promise.resolve(null);
        if (entity === VoucherBatch) return Promise.resolve(batch);
        return Promise.resolve(null);
      }),
      create: jest.fn((_: unknown, value: unknown) => value),
      save: overrides.saveError
        ? jest.fn().mockRejectedValue(overrides.saveError)
        : jest.fn().mockResolvedValue(undefined),
    },
  };
  const adapter: jest.Mocked<PaymentGatewayAdapter> = {
    createCheckout: jest.fn(),
    validateWebhook: jest.fn().mockResolvedValue(true),
    extractPaymentReference: jest.fn().mockReturnValue('provider-payment-1'),
    getPaymentStatus: overrides.providerError
      ? jest.fn().mockRejectedValue(overrides.providerError)
      : jest.fn().mockResolvedValue(payment),
  };
  const events = { emit: jest.fn() };
  const service = new WebhookProcessorService(
    events as unknown as EventEmitter2,
    adapter,
    adapter,
    {
      createQueryRunner: jest.fn().mockReturnValue(transaction),
    } as unknown as DataSource,
  );

  return {
    events,
    transaction,
    process: () =>
      service.processWebhook({
        gateway: 'STRIPE',
        rawBody: RAW_STRIPE_PAYLOAD,
        headers: { 'stripe-signature': 'signature' },
        body: {
          type: 'checkout.session.completed',
          data: { object: { id: 'provider-payment-1' } },
        },
      }),
  };
}
