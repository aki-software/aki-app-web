import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity.js';
import { User } from '../users/entities/user.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
} from '../vouchers/entities/voucher.enums.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { PaymentFulfillmentOutbox } from './entities/payment-fulfillment-outbox.entity.js';
import type {
  PaymentGatewayAdapter,
  VerifiedPayment,
} from './interfaces/payment-gateway.adapter.js';
import { WebhookProcessorService } from './services/webhook-processor.service.js';

const integration = process.env.PAYMENT_POSTGRES_INTEGRATION === 'true';
const describeIntegration = integration ? describe : describe.skip;
const DATABASE_URL = process.env.PAYMENT_TEST_DATABASE_URL;
const RAW_WEBHOOK = Buffer.from('{"data":{"id":"signed-provider-payment-1"}}');
const AUTHENTICATED_QUERY_ID = 'signed-provider-payment-1';

jest.setTimeout(30_000);

describeIntegration(
  'Phase 3 PostgreSQL WebhookProcessorService integration',
  () => {
    let dataSource: DataSource;
    let observerDataSource: DataSource;

    beforeAll(async () => {
      if (!DATABASE_URL) {
        throw new Error(
          'PAYMENT_TEST_DATABASE_URL is required when PAYMENT_POSTGRES_INTEGRATION=true',
        );
      }

      dataSource = new DataSource({
        type: 'postgres',
        url: DATABASE_URL,
        // This is an isolated disposable database. Its schema comes directly
        // from the entities used by WebhookProcessorService, not copied SQL.
        entities: [
          User,
          Institution,
          VoucherBatch,
          PaymentEvent,
          PaymentFulfillmentOutbox,
        ],
        synchronize: true,
        dropSchema: true,
      });
      await dataSource.initialize();
      observerDataSource = new DataSource({
        type: 'postgres',
        url: DATABASE_URL,
      });
      await observerDataSource.initialize();
    });

    beforeEach(async () => {
      await dataSource.synchronize(true);
    });

    afterAll(async () => {
      try {
        if (observerDataSource?.isInitialized) {
          await observerDataSource.destroy();
        }
        if (dataSource?.isInitialized) {
          await dataSource.destroy();
        }
      } finally {
        // Keep teardown explicit: this suite must never retain a PostgreSQL handle.
      }
    });

    it('settles concurrent authenticated deliveries once and emits compatibility only after commit', async () => {
      const checkoutPreferenceId = 'mp-checkout-preference-1';
      const batch = await createPendingBatch({
        paymentReference: checkoutPreferenceId,
      });
      const events = new EventEmitter2();
      let postCommitObservation:
        | Promise<{ eventCount: number; outboxCount: number }>
        | undefined;
      events.on('payment.completed', () => {
        postCommitObservation = observerDataSource
          .query(
            'SELECT (SELECT COUNT(*)::int FROM payment_event) AS "eventCount", (SELECT COUNT(*)::int FROM payment_fulfillment_outbox) AS "outboxCount"',
          )
          .then(([result]) => ({
            eventCount: result.eventCount,
            outboxCount: result.outboxCount,
          }));
      });

      const firstAdapter = approvedMercadoPagoAdapter(batch.id);
      const secondAdapter = approvedMercadoPagoAdapter(batch.id);
      const firstService = new WebhookProcessorService(
        events,
        firstAdapter,
        stripeAdapter(),
        dataSource,
      );
      const secondService = new WebhookProcessorService(
        events,
        secondAdapter,
        stripeAdapter(),
        dataSource,
      );

      await Promise.all([
        firstService.processWebhook(authenticatedWebhook()),
        secondService.processWebhook(authenticatedWebhook()),
      ]);

      const settledBatch = await dataSource
        .getRepository(VoucherBatch)
        .findOneByOrFail({ id: batch.id });
      const paymentEvents = await dataSource.getRepository(PaymentEvent).find();
      const outbox = await dataSource
        .getRepository(PaymentFulfillmentOutbox)
        .find();

      expect(settledBatch.status).toBe(VoucherBatchStatus.PAID);
      expect(settledBatch.paymentReference).toBe(checkoutPreferenceId);
      expect(paymentEvents).toHaveLength(1);
      expect(paymentEvents[0]).toMatchObject({
        gateway: 'MERCADO_PAGO',
        externalPaymentId: AUTHENTICATED_QUERY_ID,
        voucherBatchId: batch.id,
      });
      expect(outbox).toHaveLength(1);
      expect(outbox[0].voucherBatchId).toBe(batch.id);
      expect(firstAdapter.getPaymentStatus).toHaveBeenCalledWith(
        AUTHENTICATED_QUERY_ID,
      );
      expect(secondAdapter.getPaymentStatus).toHaveBeenCalledWith(
        AUTHENTICATED_QUERY_ID,
      );
      await expect(postCommitObservation).resolves.toEqual({
        eventCount: 1,
        outboxCount: 1,
      });
    });

    it('rejects an approved amount mismatch without a transition, event, outbox, or compatibility notification', async () => {
      const batch = await createPendingBatch();
      const events = new EventEmitter2();
      const emitSpy = jest.spyOn(events, 'emit');
      const adapter = approvedMercadoPagoAdapter(batch.id, {
        amountMinor: 999n,
      });
      const service = new WebhookProcessorService(
        events,
        adapter,
        stripeAdapter(),
        dataSource,
      );

      await expect(
        service.processWebhook(authenticatedWebhook()),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expectSettlementAbsent(batch.id, VoucherBatchStatus.PENDING);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('rejects an illegal approved transition without a payment effect', async () => {
      const batch = await createPendingBatch({
        status: VoucherBatchStatus.CANCELLED,
      });
      const events = new EventEmitter2();
      const emitSpy = jest.spyOn(events, 'emit');
      const service = new WebhookProcessorService(
        events,
        approvedMercadoPagoAdapter(batch.id),
        stripeAdapter(),
        dataSource,
      );

      await expect(
        service.processWebhook(authenticatedWebhook()),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expectSettlementAbsent(batch.id, VoucherBatchStatus.CANCELLED);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('returns PENDING_RETRY for a forced provider error without a payment effect', async () => {
      const batch = await createPendingBatch();
      const events = new EventEmitter2();
      const emitSpy = jest.spyOn(events, 'emit');
      const adapter = approvedMercadoPagoAdapter(batch.id, {
        providerError: new Error('ETIMEDOUT'),
      });
      const service = new WebhookProcessorService(
        events,
        adapter,
        stripeAdapter(),
        dataSource,
      );

      await expect(
        service.processWebhook(authenticatedWebhook()),
      ).resolves.toEqual({ outcome: 'PENDING_RETRY' });

      await expectSettlementAbsent(batch.id, VoucherBatchStatus.PENDING);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    async function createPendingBatch({
      status = VoucherBatchStatus.PENDING,
      paymentReference = null,
    }: {
      status?: VoucherBatchStatus;
      paymentReference?: string | null;
    } = {}): Promise<VoucherBatch> {
      return dataSource.getRepository(VoucherBatch).save({
        shortCode: `P3${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerUserId: null,
        ownerInstitutionId: null,
        quantity: 2,
        unitPrice: '5.00',
        totalPrice: '10.00',
        currency: 'USD',
        expectedAmountMinor: '1000',
        idempotencyKey: null,
        checkoutUrl: null,
        fulfilledAt: null,
        paymentProvider: 'MERCADO_PAGO',
        paymentReference,
        status,
        paidAt: null,
      });
    }

    async function expectSettlementAbsent(
      batchId: string,
      expectedStatus: VoucherBatchStatus,
    ): Promise<void> {
      const batch = await dataSource
        .getRepository(VoucherBatch)
        .findOneByOrFail({ id: batchId });
      expect(batch.status).toBe(expectedStatus);
      await expect(
        dataSource.getRepository(PaymentEvent).count(),
      ).resolves.toBe(0);
      await expect(
        dataSource.getRepository(PaymentFulfillmentOutbox).count(),
      ).resolves.toBe(0);
    }
  },
);

function authenticatedWebhook() {
  return {
    gateway: 'MERCADO_PAGO' as const,
    rawBody: RAW_WEBHOOK,
    headers: { 'x-signature': 'verified' },
    body: { data: { id: 'body-controlled-id' } },
    query: { 'data.id': AUTHENTICATED_QUERY_ID },
  };
}

function approvedMercadoPagoAdapter(
  merchantReference: string,
  overrides: {
    amountMinor?: bigint;
    providerError?: Error;
  } = {},
): jest.Mocked<PaymentGatewayAdapter> {
  const payment: VerifiedPayment = {
    providerPaymentId: AUTHENTICATED_QUERY_ID,
    merchantReference,
    amountMinor: overrides.amountMinor ?? 1000n,
    currency: 'USD',
    status: 'APPROVED',
  };

  return {
    createCheckout: jest.fn(),
    validateWebhook: jest.fn().mockResolvedValue(true),
    getAuthenticatedWebhookPaymentId: jest
      .fn()
      .mockResolvedValue(AUTHENTICATED_QUERY_ID),
    getPaymentStatus: overrides.providerError
      ? jest.fn().mockRejectedValue(overrides.providerError)
      : jest.fn().mockResolvedValue(payment),
    extractPaymentReference: jest.fn(),
  };
}

function stripeAdapter(): jest.Mocked<PaymentGatewayAdapter> {
  return {
    createCheckout: jest.fn(),
    validateWebhook: jest.fn(),
    getPaymentStatus: jest.fn(),
    extractPaymentReference: jest.fn(),
  };
}
