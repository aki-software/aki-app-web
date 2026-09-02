import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PaymentGatewayModule } from './payment-gateway.module.js';
import { PAYMENT_GATEWAY_STRIPE } from './interfaces/payment-gateway.adapter.js';
import {
  PaymentConfigurationError,
  resolvePaymentConfiguration,
} from './config/payment-configuration.js';
import {
  bindPaymentGatewayAdapter,
  type PaymentGatewayName,
} from './config/payment-gateway-binding.js';
import { SimulationPaymentGatewayAdapter } from './adapters/simulation.adapter.js';
import { StripeAdapter } from './adapters/stripe.adapter.js';
import { WebhookProcessorService } from './services/webhook-processor.service.js';
import { SecurePaymentSettlement1787000000000 } from '../migrations/1787000000000-SecurePaymentSettlement.js';

const productionEnvironment = {
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://app.example.com',
  API_URL: 'https://api.example.com',
  REDIS_HOST: 'redis.internal.example.com',
  STRIPE_SECRET_KEY: ['sk', 'live', '12345678901234567890'].join('_'),
  STRIPE_WEBHOOK_SECRET: ['whsec', '12345678901234567890'].join('_'),
  MP_ACCESS_TOKEN: 'APP_USR-12345678901234567890',
  MP_WEBHOOK_SECRET: 'mp_webhook_12345678901234567890',
  PAYMENT_IDEMPOTENCY_SECRET: 'payment-idempotency-secret-123456789012345',
  GOOGLE_PLAY_PACKAGE_NAME: 'com.example.app',
  GOOGLE_PLAY_REPORT_SKU: 'report_unlock_v2',
  GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64: 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=',
};

describe('payment security remediation', () => {
  it.each([
    ['a non-public frontend URL', { FRONTEND_URL: 'http://localhost:3000' }],
    [
      'a Stripe test credential',
      { STRIPE_SECRET_KEY: ['sk', 'test', '1234567890'].join('_') },
    ],
    [
      'a malformed Stripe webhook secret',
      { STRIPE_WEBHOOK_SECRET: ['whsec', 'short'].join('_') },
    ],
    [
      'a sandbox Mercado Pago token',
      { MP_ACCESS_TOKEN: 'TEST-12345678901234567890' },
    ],
  ])('rejects production configuration with %s', (_reason, override) => {
    expect(() =>
      resolvePaymentConfiguration({ ...productionEnvironment, ...override }),
    ).toThrow(PaymentConfigurationError);
  });

  it.each([
    'https://127.0.0.1',
    'https://0.0.0.0',
    'https://169.254.1.1',
    'https://224.0.0.1',
    'https://192.0.2.1',
    'https://[::1]',
    'https://[fe80::1]',
    'https://[::ffff:192.168.1.1]',
    'https://[ff02::1]',
    'https://[100::1]',
    'https://[3fff::1]',
    'https://[2001::1]',
    'https://[2001:0:ffff:ffff:ffff:ffff:ffff:ffff]',
    'https://[3fff:0::]',
    'https://[3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff]',
    'https://user:password@app.example.com',
  ])('rejects unsafe production endpoint %s', (frontendUrl) => {
    expect(() =>
      resolvePaymentConfiguration({
        ...productionEnvironment,
        FRONTEND_URL: frontendUrl,
      }),
    ).toThrow(PaymentConfigurationError);
  });

  it.each([
    'https://app.example.com',
    'https://payments.example.net:8443/path',
  ])('accepts a public HTTPS endpoint %s', (frontendUrl) => {
    expect(
      resolvePaymentConfiguration({
        ...productionEnvironment,
        FRONTEND_URL: frontendUrl,
      }).simulationEnabled,
    ).toBe(false);
  });
  it.each([
    'https://[2001:1::1]',
    'https://[2001:4860:4860::8888]',
    'https://[3ffe:ffff::1]',
    'https://[4000::1]',
    'https://[2606:4700:4700::1111]',
  ])('accepts a public IPv6 endpoint %s', (frontendUrl) => {
    expect(
      resolvePaymentConfiguration({
        ...productionEnvironment,
        FRONTEND_URL: frontendUrl,
      }).simulationEnabled,
    ).toBe(false);
  });

  it('rejects simulation outside test and development environments', () => {
    expect(() =>
      resolvePaymentConfiguration({
        ...productionEnvironment,
        NODE_ENV: 'staging',
        PAYMENT_SIMULATION: 'true',
      }),
    ).toThrow('PAYMENT_SIMULATION is only allowed in test or development');
  });

  it('binds the explicit simulation adapter only for a permitted environment', () => {
    const simulationAdapter = new SimulationPaymentGatewayAdapter();
    const configService = new ConfigService(productionEnvironment);

    const adapter = bindPaymentGatewayAdapter(
      'STRIPE',
      configService,
      simulationAdapter,
      { NODE_ENV: 'test', PAYMENT_SIMULATION: 'true' },
    );

    expect(adapter).toBe(simulationAdapter);
  });

  it('binds the live Stripe adapter for valid production configuration', () => {
    const simulationAdapter = new SimulationPaymentGatewayAdapter();
    const configService = new ConfigService(productionEnvironment);

    const adapter = bindPaymentGatewayAdapter(
      'STRIPE' as PaymentGatewayName,
      configService,
      simulationAdapter,
      productionEnvironment,
    );

    expect(adapter).toBeInstanceOf(StripeAdapter);
  });

  it('compiles the production PaymentGatewayModule and resolves its simulation provider', async () => {
    const previousEnvironment = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_SIMULATION = 'true';

    try {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PaymentGatewayModule,
        ],
      }).compile();

      expect(module.get(PAYMENT_GATEWAY_STRIPE)).toBeInstanceOf(
        SimulationPaymentGatewayAdapter,
      );
      await module.close();
    } finally {
      process.env = previousEnvironment;
    }
  });

  it('compiles PaymentGatewayModule with valid production configuration', async () => {
    const previousEnvironment = { ...process.env };
    Object.assign(process.env, productionEnvironment, {
      PAYMENT_SIMULATION: 'false',
    });
    try {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PaymentGatewayModule,
        ],
      }).compile();
      expect(module.get(PAYMENT_GATEWAY_STRIPE)).toBeInstanceOf(StripeAdapter);
      await module.close();
    } finally {
      process.env = previousEnvironment;
    }
  });

  it('compiles PaymentGatewayModule before resolving its providers', async () => {
    const previousEnvironment = { ...process.env };
    Object.assign(process.env, productionEnvironment, {
      STRIPE_SECRET_KEY: 'sk_test_invalid',
      PAYMENT_SIMULATION: 'false',
    });
    try {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PaymentGatewayModule,
        ],
      }).compile();

      await module.close();
    } finally {
      process.env = previousEnvironment;
    }
  });

  it('emits payment.completed after an approved settlement commits', async () => {
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const transaction = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'batch-1',
            status: 'PENDING',
            expectedAmountMinor: '1000',
            currency: 'USD',
            paymentProvider: 'STRIPE',
            paymentReference: null,
            ownerInstitutionId: 'institution-1',
            ownerInstitution: { id: 'institution-1' },
            ownerUser: { email: 'buyer@example.com' },
            quantity: 2,
            markAsPaid: jest.fn(),
          }),
        save: jest.fn(),
        create: jest.fn((_: unknown, value: unknown) => value),
      },
    };
    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(transaction),
    } as unknown as DataSource;
    const approvedAdapter = {
      createCheckout: jest.fn(),
      validateWebhook: jest.fn().mockResolvedValue(true),
      extractPaymentReference: jest.fn().mockReturnValue('payment-1'),
      getPaymentStatus: jest.fn().mockResolvedValue({
        providerPaymentId: 'payment-1',
        merchantReference: 'batch-1',
        amountMinor: 1000n,
        currency: 'USD',
        status: 'APPROVED',
      }),
    };
    const service = new WebhookProcessorService(
      eventEmitter,
      approvedAdapter,
      approvedAdapter,
      dataSource,
    );

    await service.processWebhook({
      gateway: 'STRIPE',
      rawBody: Buffer.from('{"id":"payment-1"}'),
      headers: {},
      body: { type: 'checkout.session.completed' },
    });

    expect(transaction.commitTransaction).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'payment.completed',
      expect.objectContaining({
        voucherBatchId: 'batch-1',
        institutionId: 'institution-1',
        voucherQuantity: 2,
        gateway: 'STRIPE',
      }),
    );
  });

  it('replaces the actual legacy uniqueness constraint and redacts legacy payloads', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new SecurePaymentSettlement1787000000000().up({ query } as never);

    expect(query).toHaveBeenCalledWith(
      'ALTER TABLE "payment_event" DROP CONSTRAINT IF EXISTS "UQ_b185db75a68ae755104db96e60e"',
    );
    expect(query).toHaveBeenCalledWith(
      'UPDATE "payment_event" SET "rawPayload" = NULL WHERE "rawPayload" IS NOT NULL',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        '"IDX_payment_event_gateway_external_payment" ON "payment_event" ("gateway", "externalPaymentId")',
      ),
    );
  });

  it('keeps composite uniqueness on rollback so valid cross-gateway duplicates cannot fail', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new SecurePaymentSettlement1787000000000().down({ query } as never);

    expect(query.mock.calls.join('\n')).not.toContain(
      'UNIQUE ("externalPaymentId")',
    );
    expect(query.mock.calls.join('\n')).not.toContain(
      'DROP INDEX IF EXISTS "IDX_payment_event_gateway_external_payment"',
    );
    expect(query.mock.calls.join('\n')).not.toMatch(/DROP (TABLE|COLUMN)/);
    expect(query.mock.calls.join('\n')).not.toContain('rawPayload" =');
  });
});
