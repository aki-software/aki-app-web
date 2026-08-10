import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { EventEmitter } from 'node:events';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { RequestLoggerMiddleware } from '../common/middlewares/request-logger.middleware.js';
import { RateLimitService } from '../common/services/rate-limit.service.js';
import { RATE_LIMIT_METADATA_KEY } from '../common/decorators/rate-limit.decorator.js';
import { PaymentsController } from './payments.controller.js';
import {
  toOutboxJob,
  toPaymentEvent,
} from './services/payment-safe-persistence.js';
import { WebhookController } from './webhook.controller.js';

const PAYMENT_POLICIES = [
  [
    'checkout',
    PaymentsController.prototype.initiateCheckout,
    'payment.checkout',
  ],
  [
    'google-play',
    PaymentsController.prototype.verifyGooglePlay,
    'payment.google-play.verify',
  ],
  ['webhook', WebhookController.prototype.handleWebhook, 'payment.webhook'],
] as const;

describe('payments security refactor phase 5 RED', () => {
  it.each(PAYMENT_POLICIES)(
    'configures an isolated %s rate-limit policy',
    (_route, handler, policy) => {
      const metadata = Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, handler) as
        | {
            policy?: string;
            keyPrefix?: string;
            limit?: number;
            windowMs?: number;
          }
        | undefined;

      expect(metadata).toEqual(
        expect.objectContaining({
          policy,
          keyPrefix: policy,
          limit: expect.any(Number),
          windowMs: expect.any(Number),
        }),
      );
    },
  );

  it('rejects an exceeded payment limit with standard 429 and retry headers before calling a handler', async () => {
    const response = { set: jest.fn() };
    const rateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: 1_700_000_030_000,
      }),
    };
    const guard = new RateLimitGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue({
          policy: 'payment.checkout',
          keyPrefix: 'payment.checkout',
          limit: 2,
          windowMs: 30_000,
        }),
      } as unknown as Reflector,
      rateLimitService as never,
    );

    await expect(
      guard.canActivate(
        httpContext(
          {
            originalUrl: '/payments/checkout',
            route: { path: '/payments/checkout' },
          },
          response,
        ),
      ),
    ).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({ code: 'PAYMENT_RATE_LIMITED' }),
    });
    expect(response.set).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(String),
    );
    expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('payment.checkout'),
      2,
      30_000,
    );
  });

  it('uses one canonical payment key despite gateway case, query-path, and spoofed forwarding-header variants', () => {
    const guard = new RateLimitGuard(
      {} as Reflector,
      {} as never,
    ) as unknown as {
      generateKey: (request: Record<string, unknown>) => string;
    };
    const variants = [
      {
        originalUrl: '/webhooks/payments/stripe',
        ip: '203.0.113.10',
        headers: {},
      },
      {
        originalUrl: '/webhooks/payments/STRIPE?attempt=2',
        ip: '203.0.113.10',
        headers: { 'x-forwarded-for': '198.51.100.8' },
      },
      {
        originalUrl: '/webhooks/payments/stripe',
        ip: '203.0.113.10',
        headers: { 'x-forwarded-for': '198.51.100.9' },
      },
    ];

    expect(variants.map((request) => guard.generateKey(request))).toEqual([
      'payment.webhook:203.0.113.10:stripe',
      'payment.webhook:203.0.113.10:stripe',
      'payment.webhook:203.0.113.10:stripe',
    ]);
  });

  it('fails closed in production when Redis is absent instead of using the memory store', async () => {
    const service = new RateLimitService(
      new ConfigService({ NODE_ENV: 'production' }),
    );

    try {
      await expect(
        service.checkRateLimit('payment.checkout:actor', 2, 30_000),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      service.onModuleDestroy();
    }
  });

  it('fails closed in production when Redis rejects a rate-limit operation', async () => {
    const service = new RateLimitService(
      new ConfigService({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://unused',
      }),
    );
    (
      service as unknown as {
        redis: { incr: jest.Mock; disconnect: jest.Mock };
      }
    ).redis = {
      incr: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      disconnect: jest.fn(),
    };

    try {
      await expect(
        service.checkRateLimit('payment.webhook:actor', 2, 30_000),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      service.onModuleDestroy();
    }
  });

  it('permits an explicit isolated in-memory fallback only in test/development', async () => {
    const service = new RateLimitService(
      new ConfigService({
        NODE_ENV: 'test',
        RATE_LIMIT_MEMORY_FALLBACK: 'true',
      }),
    );

    try {
      await expect(
        service.checkRateLimit('payment.checkout:test-actor', 1, 30_000),
      ).resolves.toEqual(
        expect.objectContaining({ allowed: true, remaining: 0 }),
      );
    } finally {
      service.onModuleDestroy();
    }
  });

  it('redacts payment secrets and PII while preserving request correlation, method, path, status, and duration', () => {
    const middleware = new RequestLoggerMiddleware();
    const logger = (
      middleware as unknown as { logger: { log: jest.Mock; debug: jest.Mock } }
    ).logger;
    const log = jest.spyOn(logger, 'log');
    const debug = jest.spyOn(logger, 'debug');
    const response = new EventEmitter() as EventEmitter & {
      statusCode: number;
    };
    response.statusCode = 202;
    const next = jest.fn();
    const sensitiveValues = [
      'Bearer top-secret-access-token',
      'session-cookie-secret',
      'stripe-signature-secret',
      'mp-signature-secret',
      'google-purchase-token',
      'idempotency-secret',
      'payer@example.com',
      'Buyer Name',
      'raw-card-payload',
    ];

    middleware.use(
      {
        method: 'POST',
        originalUrl: '/api/v1/payments/checkout',
        ip: '203.0.113.15',
        headers: {
          authorization: sensitiveValues[0],
          cookie: sensitiveValues[1],
          'stripe-signature': sensitiveValues[2],
          'x-signature': sensitiveValues[3],
          'x-idempotency-key': sensitiveValues[5],
          'x-request-id': 'req-safe-123',
        },
        body: {
          purchaseToken: sensitiveValues[4],
          payerEmail: sensitiveValues[6],
          buyerName: sensitiveValues[7],
          rawBody: sensitiveValues[8],
        },
        rawBody: Buffer.from(sensitiveValues[8]),
      } as never,
      response as never,
      next,
    );
    response.emit('finish');

    const recorded = [...log.mock.calls, ...debug.mock.calls].flat().join(' ');
    for (const sensitiveValue of sensitiveValues) {
      expect(recorded).not.toContain(sensitiveValue);
    }
    expect(recorded).toContain('req-safe-123');
    expect(recorded).toContain('POST');
    expect(recorded).toContain('/api/v1/payments/checkout');
    expect(recorded).toContain('202');
    expect(recorded).toMatch(/duration/i);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('persists and queues only the payment digest and provider-safe identifiers', () => {
    const persistence = loadPaymentPersistenceContract();
    const paymentInput = {
      gateway: 'STRIPE',
      externalPaymentId: 'pi_safe_123',
      status: 'APPROVED',
      voucherBatchId: 'batch-safe-123',
      rawBody: 'raw-card-payload',
    } satisfies Parameters<typeof toPaymentEvent>[0];
    const outboxInput = {
      outboxId: 'outbox-safe-123',
    } satisfies Parameters<typeof toOutboxJob>[0];

    expect(persistence.toPaymentEvent(paymentInput)).toEqual({
      gateway: 'STRIPE',
      externalPaymentId: 'pi_safe_123',
      status: 'APPROVED',
      payloadDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      voucherBatchId: 'batch-safe-123',
    });
    expect(persistence.toOutboxJob(outboxInput)).toEqual({
      outboxId: 'outbox-safe-123',
    });
  });
});

function httpContext(request: Record<string, unknown>, response: unknown) {
  return {
    getHandler: () => PaymentsController.prototype.initiateCheckout,
    getClass: () => PaymentsController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as never;
}

function loadPaymentPersistenceContract(): {
  toPaymentEvent: typeof toPaymentEvent;
  toOutboxJob: typeof toOutboxJob;
} {
  return { toPaymentEvent, toOutboxJob };
}
