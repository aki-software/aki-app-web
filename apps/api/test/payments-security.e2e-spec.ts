import {
  INestApplication,
  LoggerService,
  ValidationPipe,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { createHmac, randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Queue, Worker } from 'bullmq';
import helmet from 'helmet';
import { AuthTokenService } from '../src/auth/services/auth-token.service.js';
import { User, UserRole } from '../src/users/entities/user.entity.js';
import { Institution } from '../src/institutions/entities/institution.entity.js';
import {
  Session,
  SessionPaymentStatus,
} from '../src/sessions/entities/session.entity.js';
import { SessionResult } from '../src/sessions/entities/session-result.entity.js';
import { PricingPlan } from '../src/payments/entities/pricing-plan.entity.js';
import { VoucherBatch } from '../src/vouchers/entities/voucher-batch.entity.js';
import { Voucher } from '../src/vouchers/entities/voucher.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
} from '../src/vouchers/entities/voucher.enums.js';
import { PaymentFulfillmentOutbox } from '../src/payments/entities/payment-fulfillment-outbox.entity.js';
import { PaymentEvent } from '../src/payments/entities/payment-event.entity.js';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../src/payments/interfaces/payment-gateway.adapter.js';
import { StripeAdapter } from '../src/payments/adapters/stripe.adapter.js';
import { MercadoPagoAdapter } from '../src/payments/adapters/mercadopago.adapter.js';
import { GooglePlayAdapter } from '../src/payments/google-play.adapter.js';
import { VoucherCodeGenerator } from '../src/vouchers/services/voucher-code-generator.service.js';
import {
  VoucherFulfillmentDispatcherService,
  VOUCHER_FULFILLMENT_QUEUE,
  type VoucherFulfillmentJobPayload,
} from '../src/payments/services/voucher-fulfillment-dispatcher.service.js';
import { VoucherFulfillmentProcessor } from '../src/payments/services/voucher-fulfillment.processor.js';
import { EmailService } from '../src/notifications/services/email.service.js';
import { PaymentNotificationHandler } from '../src/notifications/handlers/payment-notification.handler.js';
import { RateLimitService } from '../src/common/services/rate-limit.service.js';

const enabled = process.env.PAYMENT_SECURITY_E2E === 'true';
const describePaymentSecurityE2e = enabled ? describe : describe.skip;

describePaymentSecurityE2e(
  'payment security acceptance (PostgreSQL + Redis + BullMQ)',
  () => {
    let harness: ReturnType<typeof createPaymentSecurityHarness>;

    jest.setTimeout(90_000);

    beforeAll(async () => {
      harness = createPaymentSecurityHarness();
      await harness.start();
    }, 90_000);
    beforeEach(async () => harness.reset());
    afterAll(async () => {
      try {
        await harness?.stop();
      } finally {
        if (harness)
          console.info(
            `[payment-e2e] stage-timings=${JSON.stringify(harness.bootstrapSnapshot().stageTimings)}`,
          );
      }
    }, 45_000);

    it('bootstrap smoke: accepts disposable infrastructure, migrates, initializes the secured Nest app, and shuts down cleanly', async () => {
      const snapshot = harness.bootstrapSnapshot();

      expect(snapshot.migrationCount).toBeGreaterThan(0);
      expect(snapshot.rawBodyEnabled).toBe(true);
      expect(snapshot.validationPipeEnabled).toBe(true);
      expect(snapshot.realPaymentProcessorRegistered).toBe(true);
      await request(harness.server())
        .post('/api/v1/webhooks/payments/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'invalid')
        .send({ id: 'bootstrap-smoke' })
        .expect(403);
    });

    it('signed webhook: Stripe accepts exact raw signatures once and rejects malformed, mismatch, and stale retries', async () => {
      const pending = await harness.seedPendingBatch('STRIPE');
      harness.stubProviderStatus('STRIPE', pending);
      const signed = harness.signStripeWebhook(pending);

      await harness
        .postWebhook('stripe', signed.headers, signed.rawBody)
        .expect(403);
      await harness
        .postWebhook('stripe', signed.mismatchedHeaders, signed.rawBody)
        .expect(403);
      await harness
        .postWebhook('stripe', signed.staleHeaders, signed.rawBody)
        .expect(403);
      await harness
        .postWebhook('stripe', signed.validHeaders, signed.rawBody)
        .expect(201);
      await harness
        .postWebhook('stripe', signed.validHeaders, signed.rawBody)
        .expect(201);

      await expect(harness.settlementState(pending.batch.id)).resolves.toEqual({
        status: VoucherBatchStatus.PAID,
        events: 1,
        outboxes: 1,
        vouchers: 0,
      });
    });

    it('signed webhook: Mercado Pago signs query identity, ignores substituted body IDs, and settles once', async () => {
      const valid = await harness.seedPendingBatch('MERCADO_PAGO');
      harness.stubProviderStatus('MERCADO_PAGO', valid);
      const validWebhook = harness.signMercadoPagoWebhook(
        valid,
        valid.externalPaymentId,
      );
      await harness
        .postWebhook(
          'mercado_pago',
          validWebhook.headers,
          validWebhook.rawBody,
          validWebhook.query,
        )
        .expect(201);

      const substitution = await harness.seedPendingBatch('MERCADO_PAGO');
      const providerSpy = harness.stubProviderStatus(
        'MERCADO_PAGO',
        substitution,
      );
      const substitutionWebhook = harness.signMercadoPagoWebhook(
        substitution,
        'attacker-controlled-body-id',
      );
      await harness
        .postWebhook(
          'mercado_pago',
          substitutionWebhook.headers,
          substitutionWebhook.rawBody,
          substitutionWebhook.query,
        )
        .expect(201);
      expect(providerSpy).toHaveBeenCalledWith(substitution.externalPaymentId);

      const invalid = await harness.seedPendingBatch('MERCADO_PAGO');
      harness.stubProviderStatus('MERCADO_PAGO', invalid);
      const invalidWebhook = harness.signMercadoPagoWebhook(
        invalid,
        invalid.externalPaymentId,
      );
      await harness
        .postWebhook(
          'mercado_pago',
          invalidWebhook.mismatchedHeaders,
          invalidWebhook.rawBody,
          `${invalidWebhook.query}-changed`,
        )
        .expect(403);
      await harness
        .postWebhook(
          'mercado_pago',
          invalidWebhook.staleHeaders,
          invalidWebhook.rawBody,
          invalidWebhook.query,
        )
        .expect(403);
      await harness
        .postWebhook(
          'mercado_pago',
          validWebhook.headers,
          validWebhook.rawBody,
          validWebhook.query,
        )
        .expect(201);

      await expect(harness.settlementState(valid.batch.id)).resolves.toEqual({
        status: VoucherBatchStatus.PAID,
        events: 1,
        outboxes: 1,
        vouchers: 0,
      });
      await expect(
        harness.settlementState(substitution.batch.id),
      ).resolves.toEqual({
        status: VoucherBatchStatus.PAID,
        events: 1,
        outboxes: 1,
        vouchers: 0,
      });
      await expect(harness.settlementState(invalid.batch.id)).resolves.toEqual({
        status: VoucherBatchStatus.PENDING,
        events: 0,
        outboxes: 0,
        vouchers: 0,
      });
    });

    it('checkout/Google: keeps an institution checkout idempotent and isolates a second tenant', async () => {
      const gatewaySpy = harness.stubCheckoutGateway('STRIPE');
      const requestData = harness.checkoutRequest('checkout-e2e-key-1');
      const first = await harness.postCheckout(requestData).expect(201);
      const duplicate = await harness.postCheckout(requestData).expect(201);

      expect(duplicate.body).toEqual(first.body);
      expect(
        await harness.checkoutBatchCount(
          requestData.headers.Authorization,
          'checkout-e2e-key-1',
        ),
      ).toBe(1);
      expect(gatewaySpy).toHaveBeenCalledTimes(1);

      const isolated = harness.checkoutRequest(
        'checkout-e2e-key-foreign',
        true,
      );
      const foreign = await harness.postCheckout(isolated).expect(201);
      expect(responseString(foreign, 'voucherBatchId')).not.toBe(
        responseString(first, 'voucherBatchId'),
      );
      expect(
        await harness.checkoutBatchCount(
          isolated.headers.Authorization,
          'checkout-e2e-key-foreign',
        ),
      ).toBe(1);
      expect(gatewaySpy).toHaveBeenCalledTimes(2);

      await request(harness.server())
        .post('/api/v1/payments/checkout')
        .set('Authorization', requestData.headers.Authorization)
        .set('X-Idempotency-Key', 'duplicate-a, duplicate-b')
        .send(requestData.body)
        .expect(400);
    });

    it('checkout/Google: unlocks only an owned completed report and rejects unauthorized or incompatible requests before verification', async () => {
      const provider = harness.stubGooglePurchase();
      const base = harness.seed();
      const foreign = await harness
        .postGooglePlay(base.foreignPatient, {
          sessionId: base.completedSession.id,
          productId: 'report_unlock_v2',
          purchaseToken: 'foreign-token-123',
        })
        .expect(400);
      expect(responseString(foreign, 'message')).toBe(
        'Error verificando la compra',
      );

      const incomplete = await harness.seedSession(base.patient, false);
      await harness
        .postGooglePlay(base.patient, {
          sessionId: incomplete.id,
          productId: 'report_unlock_v2',
          purchaseToken: 'incomplete-token-123',
        })
        .expect(400);
      await harness
        .postGooglePlay(base.patient, {
          sessionId: base.completedSession.id,
          productId: 'wrong_sku',
          purchaseToken: 'wrong-sku-token-123',
        })
        .expect(400);
      expect(provider).not.toHaveBeenCalled();

      const payload = {
        sessionId: base.completedSession.id,
        productId: 'report_unlock_v2',
        purchaseToken: 'owner-token-123',
      };
      await harness
        .postGooglePlay(base.patient, payload)
        .expect(201)
        .expect({ success: true, valid: true });
      await harness
        .postGooglePlay(base.patient, payload)
        .expect(201)
        .expect({ success: true, valid: true });
      expect(provider).toHaveBeenCalledTimes(1);

      await expect(
        harness.reportUnlockState(base.completedSession.id),
      ).resolves.toEqual({
        unlocked: true,
        token: 'owner-token-123',
        paymentStatus: SessionPaymentStatus.PENDING,
        vouchers: 0,
      });
      await harness
        .postGooglePlay(base.patient, {
          ...payload,
          purchaseToken: 'different-token-123',
        })
        .expect(400);

      const second = await harness.seedSession(base.patient, true);
      await harness
        .postGooglePlay(base.patient, { ...payload, sessionId: second.id })
        .expect(201)
        .expect({ success: false, valid: false, reason: 'ALREADY_CONSUMED' });
      await expect(harness.reportUnlockState(second.id)).resolves.toEqual({
        unlocked: false,
        token: null,
        paymentStatus: SessionPaymentStatus.PENDING,
        vouchers: 0,
      });
    });

    it('rate/privacy: enforces payment policies, fails closed on the live Redis boundary, and redacts structured logs', async () => {
      const base = harness.seed();
      const gateway = harness.stubCheckoutGateway('STRIPE');
      for (let index = 0; index < 5; index++)
        await harness
          .postCheckout(harness.checkoutRequest(`rate-checkout-${index}`))
          .expect(201);
      const checkoutLimited = await harness
        .postCheckout(harness.checkoutRequest('rate-checkout-limited'))
        .expect(429);
      expect(checkoutLimited.body).toMatchObject({
        code: 'PAYMENT_RATE_LIMITED',
        message: 'Payment request rate limit exceeded',
      });
      expect(responseHeader(checkoutLimited, 'retry-after')).toMatch(/^\d+$/);
      expect(responseHeader(checkoutLimited, 'x-ratelimit-limit')).toBe('5');
      expect(responseHeader(checkoutLimited, 'x-ratelimit-reset')).toMatch(
        /^\d+$/,
      );
      expect(gateway).toHaveBeenCalledTimes(5);

      for (let index = 0; index < 10; index++)
        await harness
          .postGooglePlay(base.patient, {
            sessionId: 'not-a-uuid',
            productId: 'report_unlock_v2',
            purchaseToken: `rate-token-${index}-123`,
          })
          .expect(400);
      await harness
        .postGooglePlay(base.patient, {
          sessionId: 'not-a-uuid',
          productId: 'report_unlock_v2',
          purchaseToken: 'rate-token-limited-123',
        })
        .expect(429);

      const redisFailure = harness.failRateLimitRedis();
      const unavailable = await harness
        .postCheckout(harness.checkoutRequest('rate-redis-failure'))
        .expect(503);
      expect(unavailable.body).toEqual(
        expect.objectContaining({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Servicio temporalmente no disponible',
          statusCode: 503,
        }),
      );
      expect(JSON.stringify(unavailable.body)).not.toContain('Redis');
      redisFailure.mockRestore();

      const sensitive = 'sensitive-payment-token-123';
      await harness
        .postWebhook(
          'stripe',
          {
            'stripe-signature': sensitive,
            'x-request-id': 'privacy-correlation-1',
            cookie: `session=${sensitive}`,
            authorization: `Bearer ${sensitive}`,
          },
          Buffer.from(
            JSON.stringify({
              type: 'checkout.session.completed',
              data: { object: { id: sensitive, email: 'person@example.com' } },
            }),
          ),
        )
        .expect(403);
      const logs = harness.capturedRedactedLogs().join('\n');
      expect(logs).not.toContain(sensitive);
      expect(logs).not.toContain('person@example.com');
      expect(logs).toContain('privacy-correlation-1');
      expect(logs).toContain('"method":"POST"');
      expect(logs).toContain('"path":"/api/v1/webhooks/payments/stripe"');
      expect(logs).toContain('"status":403');
      expect(logs).toContain('"durationMs":');

      const persisted = await harness.seedPendingBatch('STRIPE');
      harness.stubProviderStatus('STRIPE', persisted);
      const signed = harness.signStripeWebhook(persisted);
      await harness
        .postWebhook('stripe', signed.validHeaders, signed.rawBody)
        .expect(201);
      const persistedState = await harness.safePersistenceState(
        persisted.batch.id,
      );
      expect(persistedState.event.externalPaymentId).toBe(
        persisted.externalPaymentId,
      );
      expect(persistedState.event.voucherBatchId).toBe(persisted.batch.id);
      expect(persistedState.event.payloadDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(persistedState)).not.toContain('stripe-signature');
      expect(JSON.stringify(persistedState)).not.toContain(
        'person@example.com',
      );
      expect(persistedState.job).toEqual({ outboxId: persistedState.outboxId });

      for (let index = 0; index < 28; index++)
        await harness
          .postWebhook(
            'stripe',
            { 'stripe-signature': 'invalid' },
            Buffer.from('{"id":"rate"}'),
          )
          .expect(403);
      const webhookLimited = await harness
        .postWebhook(
          'stripe',
          { 'stripe-signature': 'invalid' },
          Buffer.from('{"id":"rate-limited"}'),
        )
        .expect(429);
      expect(responseHeader(webhookLimited, 'retry-after')).toMatch(/^\d+$/);
      expect(responseHeader(webhookLimited, 'x-ratelimit-limit')).toBe('30');
      expect(responseHeader(webhookLimited, 'x-ratelimit-reset')).toMatch(
        /^\d+$/,
      );
    });

    it('fulfillment recovery: preserves settlement through enqueue failure then retries one durable outbox job exactly once', async () => {
      const pending = await harness.seedPendingBatch('STRIPE');
      harness.stubProviderStatus('STRIPE', pending);
      const queueFailure = harness.failNextQueueAdd();
      const signed = harness.signStripeWebhook(pending);
      await harness
        .postWebhook('stripe', signed.validHeaders, signed.rawBody)
        .expect(201);
      await expect(harness.settlementState(pending.batch.id)).resolves.toEqual({
        status: VoucherBatchStatus.PAID,
        events: 1,
        outboxes: 1,
        vouchers: 0,
      });

      queueFailure.mockRestore();
      await harness.recoverPending();
      const recovered = await harness.safePersistenceState(pending.batch.id);
      expect(recovered.job).toEqual({ outboxId: recovered.outboxId });

      harness.failNextVoucherJob();
      await harness.resumeQueue();
      await harness.waitForOutboxRetry(
        await harness.outboxIdFor(pending.batch.id),
      );
      await expect(harness.fulfillmentState(pending.batch.id)).resolves.toEqual(
        {
          vouchers: pending.batch.quantity,
          processed: true,
          fulfilled: true,
          events: 1,
          outboxes: 1,
        },
      );

      await harness.recoverPending();
      await harness.redeliverOutboxJob(
        await harness.outboxIdFor(pending.batch.id),
      );
      await expect(harness.fulfillmentState(pending.batch.id)).resolves.toEqual(
        {
          vouchers: pending.batch.quantity,
          processed: true,
          fulfilled: true,
          events: 1,
          outboxes: 1,
        },
      );
    });

    it('keeps duplicate checkout idempotent and denies foreign tenant/patient Google Play verification', async () => {
      harness.stubCheckoutGateway('STRIPE');
      const checkout = harness.checkoutRequest('legacy-checkout-e2e-key');

      const first = await request(harness.server())
        .post('/api/v1/payments/checkout')
        .set(checkout.headers)
        .send(checkout.body);
      const duplicate = await request(harness.server())
        .post('/api/v1/payments/checkout')
        .set(checkout.headers)
        .send(checkout.body);
      expect(first.status).toBe(201);
      expect(duplicate.status).toBe(201);
      expect(responseString(first, 'voucherBatchId')).toBe(
        responseString(duplicate, 'voucherBatchId'),
      );

      await request(harness.server())
        .post('/api/v1/payments/google-play/verify')
        .set(harness.foreignPatientAuth())
        .send(harness.googlePlayPurchase())
        .expect(400);
    });

    it('settles an approved payment through outbox and BullMQ retry into exactly the requested voucher count', async () => {
      const payment = await harness.settleApprovedPayment();

      harness.failNextVoucherJob();
      await harness.waitForOutboxRetry(payment.outboxId);
      await expect(harness.voucherCount(payment.voucherBatchId)).resolves.toBe(
        payment.quantity,
      );
      await expect(harness.outboxCompleted(payment.outboxId)).resolves.toBe(
        true,
      );
    });

    it('recovers a failed queue delivery from its durable outbox without a duplicate voucher effect', async () => {
      const payment = await harness.settleApprovedPayment();

      harness.failNextVoucherJob();
      await harness.restartDispatcher();
      await harness.waitForOutboxRetry(payment.outboxId);
      await expect(harness.voucherCount(payment.voucherBatchId)).resolves.toBe(
        payment.quantity,
      );
      await expect(harness.voucherCount(payment.voucherBatchId)).resolves.toBe(
        payment.quantity,
      );
    });
  },
);

function createPaymentSecurityHarness() {
  const databaseUrl = requireDisposableUrl(
    'PAYMENT_TEST_DATABASE_URL',
    'postgres:',
  );
  const redisUrl = requireDisposableRedisUrl('PAYMENT_TEST_REDIS_URL');
  const stripeSecret = 'whsec_payment_security_e2e_0123456789';
  const mercadoPagoSecret = 'payment_security_e2e_mp_secret_0123456789';
  const capturedLogs: string[] = [];
  let app: INestApplication<App> | undefined;
  let dataSource: DataSource | undefined;
  let migrationDataSource: DataSource | undefined;
  let queue: Queue<VoucherFulfillmentJobPayload> | undefined;
  let worker: Worker | undefined;
  let dispatcher: VoucherFulfillmentDispatcherService | undefined;
  let codeGenerator: VoucherCodeGenerator | undefined;
  let authTokens: AuthTokenService | undefined;
  let stripeAdapter: StripeAdapter | undefined;
  let mercadoPagoAdapter: MercadoPagoAdapter | undefined;
  let googlePlayAdapter: GooglePlayAdapter | undefined;
  let rateLimitService: RateLimitService | undefined;
  let seeded: Seed | undefined;
  let stopped = false;
  const stageTimings: Array<{ stage: string; elapsedMs: number }> = [];
  let migrationCount = 0;
  let rawBodyEnabled = false;
  let validationPipeEnabled = false;
  let realPaymentProcessorRegistered = false;

  const server = () => {
    if (!app) throw new Error('Payment security E2E app is not started');
    return app.getHttpServer();
  };

  const start = async () => {
    configureTestEnvironment(
      databaseUrl,
      redisUrl,
      stripeSecret,
      mercadoPagoSecret,
    );
    const { typeOrmConfig } = await runStage(
      'load source-safe TypeORM configuration',
      () => import('../src/config/typeorm.config.js'),
      stageTimings,
    );
    const { AppModule } = await runStage(
      'load Nest application after test environment setup',
      () => import('../src/app.module.js'),
      stageTimings,
    );
    const migrations = await runStage(
      'load explicit migration classes',
      loadPaymentSecurityMigrations,
      stageTimings,
    );
    migrationCount = migrations.length;
    migrationDataSource = new DataSource({
      ...typeOrmConfig,
      url: databaseUrl,
      migrations,
      migrationsTransactionMode: 'none',
      synchronize: false,
      extra: { connectionTimeoutMillis: 10_000 },
    });
    await runStage(
      'connect migration DataSource',
      () => migrationDataSource!.initialize(),
      stageTimings,
      15_000,
    );
    await runStage(
      'run complete migration chain',
      () => migrationDataSource!.runMigrations(),
      stageTimings,
      45_000,
    );
    await runStage(
      'close migration DataSource',
      () => migrationDataSource!.destroy(),
      stageTimings,
      15_000,
    );
    migrationDataSource = undefined;

    const moduleFixture: TestingModule = await runStage(
      'compile Nest module',
      () =>
        Test.createTestingModule({
          imports: [AppModule],
        })
          .overrideProvider(EmailService)
          .useValue({ sendEmail: () => Promise.resolve(undefined) })
          .overrideProvider(PaymentNotificationHandler)
          .useValue({
            handlePaymentCompleted: () => Promise.resolve(undefined),
          })
          .compile(),
      stageTimings,
      45_000,
    );

    app = moduleFixture.createNestApplication({ rawBody: true });
    rawBodyEnabled = true;
    app.use(helmet({ crossOriginEmbedderPolicy: false }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    validationPipeEnabled = true;
    app.setGlobalPrefix('api/v1', { exclude: ['health', '/'] });
    app.useLogger(captureLogger(capturedLogs));
    await runStage(
      'initialize Nest application',
      () => app!.init(),
      stageTimings,
      45_000,
    );

    dataSource = app.get(DataSource);
    authTokens = app.get(AuthTokenService);
    stripeAdapter = app.get<StripeAdapter>(PAYMENT_GATEWAY_STRIPE);
    mercadoPagoAdapter = app.get<MercadoPagoAdapter>(PAYMENT_GATEWAY_MP);
    googlePlayAdapter = app.get(GooglePlayAdapter);
    rateLimitService = app.get(RateLimitService);
    queue = app.get<Queue>(getQueueToken(VOUCHER_FULFILLMENT_QUEUE));
    dispatcher = app.get(VoucherFulfillmentDispatcherService);
    codeGenerator = app.get(VoucherCodeGenerator);
    realPaymentProcessorRegistered =
      app.get(VoucherFulfillmentProcessor) instanceof
      VoucherFulfillmentProcessor;
    if (!realPaymentProcessorRegistered)
      throw new Error('Real voucher fulfillment processor was not registered');
  };

  const reset = async () => {
    jest.restoreAllMocks();
    capturedLogs.length = 0;
    if (queue) {
      await queue.pause();
      await eventually(
        async () => (await queue!.getActiveCount()) === 0,
        5_000,
      );
      await queue.obliterate({ force: true });
      const rateRedis = (
        rateLimitService as unknown as
          | { redis?: { flushdb: () => Promise<unknown> } }
          | undefined
      )?.redis;
      if (rateRedis) await rateRedis.flushdb();
      await queue.pause();
    }
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE "payment_fulfillment_outbox", "payment_event", "vouchers", "voucher_batches", "pricing_plan", "sessions", "users", "institutions" RESTART IDENTITY CASCADE',
      );
    }
    seeded = await seedBaseData();
    if (worker?.isPaused()) worker.resume();
  };

  const seedPendingBatch = async (gateway: 'STRIPE' | 'MERCADO_PAGO') => {
    const base = seeded ?? (await seedBaseData());
    const batch = await repository(VoucherBatch).save({
      shortCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      ownerType: VoucherOwnerType.INSTITUTION,
      ownerInstitutionId: base.institution.id,
      quantity: 3,
      unitPrice: '5.00',
      totalPrice: '15.00',
      currency: 'USD',
      expectedAmountMinor: '1500',
      idempotencyKey: null,
      checkoutUrl: null,
      fulfilledAt: null,
      paymentProvider: gateway,
      paymentReference: `${gateway.toLowerCase()}_seed`,
      status: VoucherBatchStatus.PENDING,
      paidAt: null,
    });
    return {
      batch,
      externalPaymentId: `${gateway === 'STRIPE' ? 'cs' : 'mp'}_${batch.id.slice(0, 8)}`,
      gateway,
    };
  };

  const checkoutRequest = (idempotencyKey: string, foreign = false) => {
    const base = requireSeed();
    const user = foreign ? base.foreignAdmin : base.institutionAdmin;
    return {
      headers: {
        Authorization: `Bearer ${principal(user)}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: {
        planId: base.plan.id,
        gateway: 'STRIPE',
        successUrl: 'https://app.akit.example/billing/success',
        failureUrl: 'https://app.akit.example/billing/failure',
      },
    };
  };

  const settleApprovedPayment = async () => {
    const pending = await seedPendingBatch('STRIPE');
    stubProviderStatus('STRIPE', pending);
    const signed = signStripeWebhook(pending);
    await postWebhook('stripe', signed.validHeaders, signed.rawBody).expect(
      201,
    );
    const outbox = await repository(PaymentFulfillmentOutbox).findOneByOrFail({
      voucherBatchId: pending.batch.id,
    });
    return {
      outboxId: outbox.id,
      voucherBatchId: pending.batch.id,
      quantity: pending.batch.quantity,
    };
  };

  const failNextVoucherJob = () => {
    if (!codeGenerator)
      throw new Error('Voucher code generator is unavailable');
    jest
      .spyOn(codeGenerator, 'generateUniqueCode')
      .mockRejectedValueOnce(new Error('deterministic voucher worker failure'));
  };

  const waitForOutboxRetry = async (outboxId: string) => {
    if (worker?.isPaused()) worker.resume();
    if (queue) await queue.resume();
    await eventually(async () => {
      const outbox = await repository(PaymentFulfillmentOutbox).findOneByOrFail(
        { id: outboxId },
      );
      return !!outbox.processedAt;
    });
  };

  const restartDispatcher = async () => dispatcher?.recoverPending();
  const voucherCount = async (voucherBatchId: string) =>
    repository(Voucher).count({ where: { batchId: voucherBatchId } });
  const outboxCompleted = async (outboxId: string) =>
    !!(
      await repository(PaymentFulfillmentOutbox).findOneByOrFail({
        id: outboxId,
      })
    ).processedAt;
  const foreignPatientAuth = () => ({
    Authorization: `Bearer ${principal(requireSeed().foreignPatient)}`,
  });
  const googlePlayPurchase = () => ({
    sessionId: requireSeed().completedSession.id,
    productId: 'report_unlock_v2',
    purchaseToken: 'foreign-token-e2e',
  });
  const capturedRedactedLogs = () => [...capturedLogs];

  const principal = (user: User) =>
    authTokens!.signAccessToken({
      email: user.email,
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId,
    });
  const repository = <T extends object>(entity: new () => T) => {
    if (!dataSource)
      throw new Error('Payment security E2E data source is unavailable');
    return dataSource.getRepository(entity);
  };
  const requireSeed = () => {
    if (!seeded)
      throw new Error('Payment security E2E fixtures are unavailable');
    return seeded;
  };
  const seedBaseData = async (): Promise<Seed> => {
    const institution = await repository(Institution).save({
      name: 'Payment E2E Institution',
      billingEmail: 'billing@akit.example',
    });
    const foreignInstitution = await repository(Institution).save({
      name: 'Foreign E2E Institution',
      billingEmail: 'foreign@akit.example',
    });
    const institutionAdmin = await repository(User).save({
      name: 'Payment E2E Admin',
      email: 'payment-e2e-admin@akit.example',
      passwordHash: 'not-used',
      role: UserRole.INSTITUTION_ADMIN,
      institutionId: institution.id,
    });
    const foreignAdmin = await repository(User).save({
      name: 'Foreign E2E Admin',
      email: 'payment-e2e-foreign-admin@akit.example',
      passwordHash: 'not-used',
      role: UserRole.INSTITUTION_ADMIN,
      institutionId: foreignInstitution.id,
    });
    const patient = await repository(User).save({
      name: 'Payment E2E Patient',
      email: 'payment-e2e-patient@akit.example',
      passwordHash: 'not-used',
      role: 'PATIENT' as UserRole,
      institutionId: institution.id,
    });
    const foreignPatient = await repository(User).save({
      name: 'Foreign E2E Patient',
      email: 'payment-e2e-foreign@akit.example',
      passwordHash: 'not-used',
      role: 'PATIENT' as UserRole,
      institutionId: foreignInstitution.id,
    });
    const plan = await repository(PricingPlan).save({
      name: 'Payment E2E plan',
      description: 'deterministic',
      voucherQuantity: 3,
      priceUsd: 15,
      isActive: true,
    });
    const completedSession = await seedSession(
      patient,
      true,
      'payment-e2e-session',
    );
    return {
      institution,
      institutionAdmin,
      foreignAdmin,
      patient,
      foreignPatient,
      plan,
      completedSession,
    };
  };
  const seedSession = async (
    patient: User,
    complete: boolean,
    syncKey = `payment-e2e-session-${randomUUID()}`,
  ) => {
    const session = await repository(Session).save({
      patientId: patient.id,
      institutionId: patient.institutionId,
      patientName: patient.name,
      sessionDate: new Date(),
      totalTimeMs: 1_000,
      syncKey,
      paymentStatus: SessionPaymentStatus.PENDING,
      expectedReportSku: 'report_unlock_v2',
      reportUnlockedAt: null,
      reportUnlockPurchaseToken: null,
      paymentReference: null,
    });
    if (complete)
      await repository(SessionResult).save({
        session,
        categoryId: 'E2E',
        score: 1,
        totalPossible: 1,
        percentage: 100,
        weightedScore: 1,
        avgResponseTimeMs: 1,
        timeSpentMs: 1,
      });
    return session;
  };
  const stubProviderStatus = (
    gateway: PendingWebhook['gateway'],
    pending: PendingWebhook,
  ) => {
    const adapter = gateway === 'STRIPE' ? stripeAdapter : mercadoPagoAdapter;
    if (!adapter) throw new Error(`${gateway} adapter is unavailable`);
    return jest.spyOn(adapter, 'getPaymentStatus').mockResolvedValue({
      providerPaymentId: pending.externalPaymentId,
      merchantReference: pending.batch.id,
      amountMinor: 1500n,
      currency: 'USD',
      status: 'APPROVED',
    });
  };
  const signStripeWebhook = (pending: PendingWebhook) => {
    const rawBody = Buffer.from(
      JSON.stringify({
        id: `evt_${pending.batch.id}`,
        type: 'checkout.session.completed',
        data: { object: { id: pending.externalPaymentId } },
      }),
    );
    const now = Math.floor(Date.now() / 1000);
    const header = (payload: string, timestamp: number) => ({
      'stripe-signature': Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: stripeSecret,
        timestamp,
      }),
    });
    return {
      rawBody,
      validHeaders: header(rawBody.toString('utf8'), now),
      staleHeaders: header(rawBody.toString('utf8'), now - 301),
      mismatchedHeaders: header(`${rawBody.toString('utf8')}x`, now),
      headers: { 'stripe-signature': 'malformed' },
    };
  };
  const signMercadoPagoWebhook = (
    pending: PendingWebhook,
    bodyPaymentId: string,
  ) => {
    const query = `data.id=${encodeURIComponent(pending.externalPaymentId)}`;
    const requestId = `mp-request-${pending.batch.id.slice(0, 8)}`;
    const signature = (timestamp: number) =>
      createHmac('sha256', mercadoPagoSecret)
        .update(
          `id:${pending.externalPaymentId};request-id:${requestId};ts:${timestamp};`,
        )
        .digest('hex');
    const now = Date.now();
    return {
      query,
      rawBody: Buffer.from(
        JSON.stringify({ type: 'payment', data: { id: bodyPaymentId } }),
      ),
      headers: {
        'x-request-id': requestId,
        'x-signature': `ts=${now},v1=${signature(now)}`,
      },
      staleHeaders: {
        'x-request-id': requestId,
        'x-signature': `ts=${now - 301_000},v1=${signature(now - 301_000)}`,
      },
      mismatchedHeaders: {
        'x-request-id': requestId,
        'x-signature': `ts=${now},v1=${signature(now)}`,
      },
    };
  };
  const postWebhook = (
    gateway: 'stripe' | 'mercado_pago',
    headers: Record<string, string>,
    rawBody: Buffer,
    query = '',
  ) =>
    request(server())
      .post(`/api/v1/webhooks/payments/${gateway}${query ? `?${query}` : ''}`)
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(rawBody.toString('utf8'));
  const settlementState = async (voucherBatchId: string) => ({
    status: (
      await repository(VoucherBatch).findOneByOrFail({ id: voucherBatchId })
    ).status,
    events: await repository(PaymentEvent).count({ where: { voucherBatchId } }),
    outboxes: await repository(PaymentFulfillmentOutbox).count({
      where: { voucherBatchId },
    }),
    vouchers: await repository(Voucher).count({
      where: { batchId: voucherBatchId },
    }),
  });
  const stubCheckoutGateway = (gateway: 'STRIPE' | 'MERCADO_PAGO') => {
    const adapter = gateway === 'STRIPE' ? stripeAdapter : mercadoPagoAdapter;
    if (!adapter) throw new Error(`${gateway} adapter is unavailable`);
    return jest
      .spyOn(adapter, 'createCheckout')
      .mockImplementation(({ voucherBatchId }) =>
        Promise.resolve({
          checkoutUrl: `https://checkout.akit.example/${gateway.toLowerCase()}/${voucherBatchId}`,
          externalReference: `checkout_${voucherBatchId}`,
        }),
      );
  };
  const postCheckout = (requestData: {
    headers: Record<string, string>;
    body: object;
  }) =>
    request(server())
      .post('/api/v1/payments/checkout')
      .set(requestData.headers)
      .send(requestData.body);
  const checkoutBatchCount = async (
    authorization: string,
    idempotencyKey: string,
  ) => {
    const token = authorization.replace('Bearer ', '');
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { institutionId: string };
    return repository(VoucherBatch).count({
      where: { ownerInstitutionId: payload.institutionId, idempotencyKey },
    });
  };
  const stubGooglePurchase = () => {
    if (!googlePlayAdapter)
      throw new Error('Google Play adapter is unavailable');
    const get = jest.fn().mockResolvedValue({
      data: { purchaseState: 0, productId: 'report_unlock_v2' },
    });
    jest
      .spyOn(googlePlayAdapter, 'getAndroidPublisher')
      .mockResolvedValue({ purchases: { products: { get } } } as never);
    return get;
  };
  const postGooglePlay = (user: User, body: object) =>
    request(server())
      .post('/api/v1/payments/google-play/verify')
      .set('Authorization', `Bearer ${principal(user)}`)
      .send(body);
  const reportUnlockState = async (sessionId: string) => {
    const session = await repository(Session).findOneByOrFail({
      id: sessionId,
    });
    return {
      unlocked: !!session.reportUnlockedAt,
      token: session.reportUnlockPurchaseToken,
      paymentStatus: session.paymentStatus,
      vouchers: await repository(Voucher).count(),
    };
  };
  const failRateLimitRedis = () => {
    const redis = (
      rateLimitService as unknown as
        | { redis?: { incr: () => Promise<number> } }
        | undefined
    )?.redis;
    if (!redis) throw new Error('Rate-limit Redis client is unavailable');
    return jest
      .spyOn(redis, 'incr')
      .mockRejectedValue(new Error('deterministic Redis command failure'));
  };
  const safePersistenceState = async (voucherBatchId: string) => {
    const event = await repository(PaymentEvent).findOneByOrFail({
      voucherBatchId,
    });
    const outbox = await repository(PaymentFulfillmentOutbox).findOneByOrFail({
      voucherBatchId,
    });
    await eventually(async () => !!(await queue?.getJob(outbox.id)), 5_000);
    return {
      event,
      outboxId: outbox.id,
      job: (await queue?.getJob(outbox.id))?.data,
    };
  };
  const failNextQueueAdd = () => {
    if (!queue) throw new Error('Fulfillment queue is unavailable');
    return jest
      .spyOn(queue, 'add')
      .mockRejectedValueOnce(new Error('deterministic queue add failure'));
  };
  const recoverPending = async () => {
    if (!dispatcher) throw new Error('Fulfillment dispatcher is unavailable');
    await dispatcher.recoverPending();
  };
  const resumeQueue = async () => queue?.resume();
  const outboxIdFor = async (voucherBatchId: string) =>
    (
      await repository(PaymentFulfillmentOutbox).findOneByOrFail({
        voucherBatchId,
      })
    ).id;
  const fulfillmentState = async (voucherBatchId: string) => {
    const batch = await repository(VoucherBatch).findOneByOrFail({
      id: voucherBatchId,
    });
    const outbox = await repository(PaymentFulfillmentOutbox).findOneByOrFail({
      voucherBatchId,
    });
    return {
      vouchers: await repository(Voucher).count({
        where: { batchId: voucherBatchId },
      }),
      processed: !!outbox.processedAt,
      fulfilled: !!batch.fulfilledAt,
      events: await repository(PaymentEvent).count({
        where: { voucherBatchId },
      }),
      outboxes: await repository(PaymentFulfillmentOutbox).count({
        where: { voucherBatchId },
      }),
    };
  };
  const redeliverOutboxJob = async (outboxId: string) => {
    if (!queue) throw new Error('Fulfillment queue is unavailable');
    await queue.add(
      'voucher-fulfillment',
      { outboxId },
      { jobId: `${outboxId}-redelivery` },
    );
    await eventually(
      async () =>
        !!(
          await repository(PaymentFulfillmentOutbox).findOneByOrFail({
            id: outboxId,
          })
        ).processedAt,
      10_000,
    );
  };
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    const failures: unknown[] = [];
    if (app) {
      try {
        await runStage(
          'close Nest-owned resources',
          () => app!.close(),
          stageTimings,
          45_000,
        );
      } catch (error) {
        failures.push(error);
      } finally {
        app = undefined;
        dataSource = undefined;
        queue = undefined;
        worker = undefined;
      }
    }
    if (migrationDataSource?.isInitialized) {
      try {
        await runStage(
          'close partial migration DataSource',
          () => migrationDataSource!.destroy(),
          stageTimings,
          15_000,
        );
      } catch (error) {
        failures.push(error);
      } finally {
        migrationDataSource = undefined;
      }
    }
    if (failures.length > 0)
      throw new AggregateError(
        failures,
        'Payment security E2E teardown failed',
      );
  };

  const bootstrapSnapshot = () => ({
    migrationCount,
    rawBodyEnabled,
    validationPipeEnabled,
    realPaymentProcessorRegistered,
    stageTimings: [...stageTimings],
  });

  return {
    start,
    stop,
    reset,
    server,
    seedPendingBatch,
    checkoutRequest,
    settleApprovedPayment,
    failNextVoucherJob,
    waitForOutboxRetry,
    restartDispatcher,
    voucherCount,
    outboxCompleted,
    foreignPatientAuth,
    googlePlayPurchase,
    stubProviderStatus,
    signStripeWebhook,
    signMercadoPagoWebhook,
    postWebhook,
    settlementState,
    stubCheckoutGateway,
    postCheckout,
    checkoutBatchCount,
    stubGooglePurchase,
    postGooglePlay,
    reportUnlockState,
    failRateLimitRedis,
    safePersistenceState,
    failNextQueueAdd,
    recoverPending,
    resumeQueue,
    outboxIdFor,
    fulfillmentState,
    redeliverOutboxJob,
    seed: requireSeed,
    seedSession,
    capturedRedactedLogs,
    bootstrapSnapshot,
  };
}

type PendingWebhook = {
  batch: VoucherBatch;
  externalPaymentId: string;
  gateway: 'STRIPE' | 'MERCADO_PAGO';
};
type Seed = {
  institution: Institution;
  institutionAdmin: User;
  foreignAdmin: User;
  patient: User;
  foreignPatient: User;
  plan: PricingPlan;
  completedSession: Session;
};

function configureTestEnvironment(
  databaseUrl: string,
  redisUrl: string,
  stripeSecret: string,
  mercadoPagoSecret: string,
): void {
  const redis = new URL(redisUrl);
  Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'payment-security-e2e-jwt-secret-6ac82a61f3b748a2b1b964df',
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    REDIS_HOST: redis.hostname,
    REDIS_PORT: redis.port || '6379',
    REDIS_USERNAME: decodeURIComponent(redis.username),
    REDIS_PASSWORD: decodeURIComponent(redis.password),
    REDIS_DB: redis.pathname === '/' ? '0' : redis.pathname.slice(1),
    REDIS_TLS: redis.protocol === 'rediss:' ? 'true' : 'false',
    PAYMENT_SIMULATION: 'false',
    FRONTEND_URL: 'https://app.akit.example',
    API_URL: 'https://api.akit.example',
    STRIPE_WEBHOOK_SECRET: stripeSecret,
    STRIPE_SECRET_KEY: 'sk_test_payment_security_e2e_0123456789',
    MP_WEBHOOK_SECRET: mercadoPagoSecret,
    MP_ACCESS_TOKEN: 'TEST-payment-security-e2e-access-token',
    GOOGLE_PLAY_PACKAGE_NAME: 'com.akit.e2e',
    GOOGLE_PLAY_REPORT_SKU: 'report_unlock_v2',
  });
}

function requireDisposableUrl(name: string, protocol: string): string {
  const value = process.env[name];
  if (!value?.startsWith(protocol))
    throw new Error(
      `${name} must provide a disposable ${protocol} endpoint when PAYMENT_SECURITY_E2E=true`,
    );
  const url = new URL(value);
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    (protocol === 'postgres:' && !/payment|e2e|test/i.test(url.pathname))
  )
    throw new Error(
      `${name} must target an isolated local payment E2E database, never a shared endpoint`,
    );
  return value;
}

function requireDisposableRedisUrl(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} must provide a disposable Redis endpoint when PAYMENT_SECURITY_E2E=true`,
    );
  const url = new URL(value);
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error(`${name} must use redis:// or rediss://`);
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(
      `${name} must target a local dedicated Redis instance, never a shared endpoint`,
    );
  }
  const database = url.pathname === '/' ? 0 : Number(url.pathname.slice(1));
  if (!Number.isInteger(database) || database < 1 || database > 15) {
    throw new Error(
      `${name} must use a dedicated Redis database from 1 through 15`,
    );
  }
  if (
    url.protocol === 'rediss:' &&
    process.env.PAYMENT_TEST_REDIS_TLS !== 'true'
  ) {
    throw new Error(
      `${name} uses TLS but PAYMENT_TEST_REDIS_TLS=true was not explicitly acknowledged`,
    );
  }
  return value;
}

async function runStage<T>(
  stage: string,
  operation: () => Promise<T>,
  timings: Array<{ stage: string; elapsedMs: number }>,
  timeoutMs = 30_000,
): Promise<T> {
  const startedAt = Date.now();
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(new Error(`Timed out after ${timeoutMs}ms during ${stage}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    timings.push({ stage, elapsedMs: Date.now() - startedAt });
  }
}

async function loadPaymentSecurityMigrations(): Promise<
  Array<new () => import('typeorm').MigrationInterface>
> {
  const modules = await Promise.all([
    import('../src/migrations/1776000000000-InitialMvpSchema.js'),
    import('../src/migrations/1776100000000-SessionOwnershipPhase1.js'),
    import('../src/migrations/1776200000000-UserRolePatient.js'),
    import('../src/migrations/1776300000000-UnifyVoucherOwnershipInstitution.js'),
    import('../src/migrations/1776400000000-RenameVoucherPurchaserToOwner.js'),
    import('../src/migrations/1776500000000-UserPasswordSetup.js'),
    import('../src/migrations/1776900000000-SetVoucherCodeLength8.js'),
    import('../src/migrations/1777000000000-CreateTresAreasCombinations.js'),
    import('../src/migrations/1777100000000-AddInstitutionAdminRole.js'),
    import('../src/migrations/1777200000000-CreateSessionMetrics.js'),
    import('../src/migrations/1777300000000-UserPasswordReset.js'),
    import('../src/migrations/1777400000000-SessionSyncKey.js'),
    import('../src/migrations/1777500000000-AddIndexesAndSoftDelete.js'),
    import('../src/migrations/1778000000000-SeparatePatientEntity.js'),
    import('../src/migrations/1780405141840-AddTimeSpentToSessionResult.js'),
    import('../src/migrations/1780413280950-MakePaymentReferenceUnique.js'),
    import('../src/migrations/1780451337572-TimestampsToTimestamptz.js'),
    import('../src/migrations/1780455000000-AddWeightedScoresToSessionResult.js'),
    import('../src/migrations/1780600000000-AddBehavMetrics.js'),
    import('../src/migrations/1784084164100-AddCustomSectionsToCombinations.js'),
    import('../src/migrations/1785964171325-AddVoucherBatchShortCode.js'),
    import('../src/migrations/1786000000000-CreatePaymentGatewayTables.js'),
    import('../src/migrations/1786100000000-AddDescriptionToPricingPlan.js'),
    import('../src/migrations/1787000000000-SecurePaymentSettlement.js'),
    import('../src/migrations/1787000000001-CheckoutFailureAndReportUnlock.js'),
    import('../src/migrations/1787000000002-SessionReportSkuExpectation.js'),
    import('../src/migrations/1787000000003-ReportLifecycleSchema.js'),
    import('../src/migrations/1787000000004-ReportAccessAuditSchema.js'),
    import('../src/migrations/1787000000005-ReportInputSnapshotAndStoragePending.js'),
    import('../src/migrations/1787000000006-ReportDelivery.js'),
    import('../src/migrations/1787000000007-ReportDeliveryAuthorization.js'),
  ]);
  return modules.flatMap((module) =>
    Object.values(module).filter(
      (value): value is new () => import('typeorm').MigrationInterface =>
        typeof value === 'function',
    ),
  );
}

async function eventually(
  check: () => Promise<boolean>,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() >= deadline)
      throw new Error('Timed out waiting for deterministic BullMQ completion');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
function captureLogger(logs: string[]): LoggerService {
  const capture = (...parts: unknown[]) =>
    logs.push(
      parts
        .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join(' '),
    );
  return {
    log: capture,
    error: capture,
    warn: capture,
    debug: capture,
    verbose: capture,
    fatal: capture,
  };
}

function responseString(response: { body: unknown }, field: string): string {
  if (
    typeof response.body !== 'object' ||
    response.body === null ||
    typeof (response.body as Record<string, unknown>)[field] !== 'string'
  ) {
    throw new Error(`Response body is missing string field ${field}`);
  }
  return (response.body as Record<string, string>)[field];
}

function responseHeader(response: { headers: unknown }, field: string): string {
  if (
    typeof response.headers !== 'object' ||
    response.headers === null ||
    typeof (response.headers as Record<string, unknown>)[field] !== 'string'
  ) {
    throw new Error(`Response headers are missing string field ${field}`);
  }
  return (response.headers as Record<string, string>)[field];
}
