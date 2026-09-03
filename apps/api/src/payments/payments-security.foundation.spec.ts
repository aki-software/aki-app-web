import {
  PaymentConfigurationError,
  resolvePaymentConfiguration,
} from './config/payment-configuration.js';
import {
  createVerifiedPayment,
  toMinorUnits,
} from './interfaces/payment-gateway.adapter.js';
import { SecurePaymentSettlement1787000000000 } from '../migrations/1787000000000-SecurePaymentSettlement.js';
import { HealthController } from '../health.controller.js';

describe('payment security foundation', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.example.com',
    API_URL: 'https://api.example.com',
    REDIS_HOST: 'redis.example.com',
    STRIPE_SECRET_KEY: 'stripe-secret-placeholder',
    STRIPE_WEBHOOK_SECRET: 'stripe-webhook-secret-placeholder',
    MP_ACCESS_TOKEN: 'APP_USR-12345678901234567890',
    MP_WEBHOOK_SECRET: 'mp_webhook_12345678901234567890',
    PAYMENT_IDEMPOTENCY_SECRET: 'a'.repeat(32),
    GOOGLE_PLAY_PACKAGE_NAME: 'com.example.app',
    GOOGLE_PLAY_REPORT_SKU: 'report_unlock_v2',
    GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64: 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=',
  };

  it('allows MP-only production configuration without Stripe credentials', () => {
    expect(
      resolvePaymentConfiguration({
        ...productionEnvironment,
        PAYMENT_GATEWAY: 'MERCADO_PAGO',
        STRIPE_SECRET_KEY: undefined,
        STRIPE_WEBHOOK_SECRET: undefined,
        GOOGLE_PLAY_PACKAGE_NAME: undefined,
        GOOGLE_PLAY_REPORT_SKU: undefined,
        GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64: undefined,
      }),
    ).toEqual(expect.objectContaining({ gateway: 'MERCADO_PAGO' }));
  });

  it('reports redacted payment readiness from health', () => {
    const environment = jest.replaceProperty(process, 'env', {
      ...process.env,
      PAYMENT_GATEWAY: 'MERCADO_PAGO',
      FRONTEND_URL: 'https://app.example.com',
      API_URL: 'https://api.example.com',
      MP_ACCESS_TOKEN: 'mp-access-token',
      MP_WEBHOOK_SECRET: 'mp-webhook-secret',
      PAYMENT_IDEMPOTENCY_SECRET: 'a'.repeat(32),
    });
    try {
      const health = new HealthController().checkHealth();
      expect(health.payment).toEqual({
        gateway: 'MERCADO_PAGO',
        configured: true,
      });
      expect(JSON.stringify(health.payment)).not.toContain('mp-access-token');
      expect(JSON.stringify(health.payment)).not.toContain('MP_ACCESS_TOKEN');
    } finally {
      environment.restore();
    }
  });

  it('fails production startup when a required payment secret is absent', () => {
    expect(() =>
      resolvePaymentConfiguration({
        ...productionEnvironment,
        STRIPE_WEBHOOK_SECRET: undefined,
      }),
    ).toThrow(PaymentConfigurationError);
  });

  it('fails production startup when the Google Play service account is absent', () => {
    expect(() =>
      resolvePaymentConfiguration({
        ...productionEnvironment,
        GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64: undefined,
      }),
    ).toThrow(PaymentConfigurationError);
  });

  it('binds simulation only when explicitly enabled outside production', () => {
    expect(
      resolvePaymentConfiguration({
        NODE_ENV: 'test',
        PAYMENT_SIMULATION: 'true',
      }).simulationEnabled,
    ).toBe(true);

    expect(() =>
      resolvePaymentConfiguration({
        ...productionEnvironment,
        PAYMENT_SIMULATION: 'true',
      }),
    ).toThrow('PAYMENT_SIMULATION cannot be enabled in production');
  });

  it('converts decimal amounts to integer minor units without floating-point drift', () => {
    expect(toMinorUnits('10.23', 'USD')).toBe(1023n);
    expect(toMinorUnits('100', 'JPY')).toBe(100n);
  });

  it('rejects amount precision not supported by the currency', () => {
    expect(() => toMinorUnits('10.234', 'USD')).toThrow(
      'exceeds the supported precision',
    );
  });

  it('creates the normalized verified payment contract', () => {
    expect(
      createVerifiedPayment({
        providerPaymentId: 'payment_123',
        merchantReference: 'batch_123',
        amountMinor: 1023n,
        currency: 'usd',
        status: 'APPROVED',
      }),
    ).toEqual({
      providerPaymentId: 'payment_123',
      merchantReference: 'batch_123',
      amountMinor: 1023n,
      currency: 'USD',
      status: 'APPROVED',
    });
  });

  it('rejects a normalized payment with an invalid currency code', () => {
    expect(() =>
      createVerifiedPayment({
        providerPaymentId: 'payment_123',
        merchantReference: 'batch_123',
        amountMinor: 1023n,
        currency: 'US',
        status: 'APPROVED',
      }),
    ).toThrow('ISO 4217');
  });

  it('adds the database constraints required for payment authority', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new SecurePaymentSettlement1787000000000();

    await migration.up({ query } as never);

    const statements = query.mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(statements).toContain('expected_amount_minor');
    expect(statements).toContain('idempotency_key');
    expect(statements).toContain('IDX_voucher_batches_institution_idempotency');
    expect(statements).toContain('IDX_payment_event_gateway_external_payment');
    expect(statements).toContain('payment_fulfillment_outbox');
  });
});
