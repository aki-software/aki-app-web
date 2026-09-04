import { DataSource } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity.js';
import { PaymentNotificationDeliveries1787380000000 } from '../migrations/1787380000000-PaymentNotificationDeliveries.js';
import { User } from '../users/entities/user.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { PaymentNotificationDelivery } from './entities/payment-notification-delivery.entity.js';
import { PaymentNotificationDispatcherService } from './services/payment-notification-dispatcher.service.js';

const postgresIntegration =
  process.env.PAYMENT_POSTGRES_INTEGRATION === 'true' &&
  Boolean(process.env.PAYMENT_TEST_DATABASE_URL);
const describePostgres = postgresIntegration ? describe : describe.skip;
const context = (voucherBatchId: string) => ({
  version: 1,
  voucherBatchId,
  checkoutAttemptId: 'checkout',
  paymentEventId: 'event',
  institution: {},
  buyer: {},
  commercial: {},
  charged: {},
  payment: {},
  fulfilledAt: '2026-01-01T00:00:00.000Z',
});
const uuid = (number: number) =>
  `00000000-0000-0000-0000-${String(number).padStart(12, '0')}`;

describePostgres('PaymentNotificationDispatcher PostgreSQL recovery', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PAYMENT_TEST_DATABASE_URL,
      dropSchema: true,
      entities: [PaymentNotificationDelivery, User, VoucherBatch, Institution],
    });
    await dataSource.initialize();
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.query(
      'CREATE TABLE "users" ("id" uuid PRIMARY KEY, "name" text, "email" text, "role" text, "deleted_at" timestamptz)',
    );
    await dataSource.query(
      'CREATE TABLE "voucher_batches" ("id" uuid PRIMARY KEY, "status" text, "fulfilled_at" timestamptz, "paid_at" timestamptz)',
    );
    await dataSource.query(
      'CREATE TABLE "payment_event" ("id" uuid PRIMARY KEY, "voucherBatchId" uuid, "status" text, "createdAt" timestamptz)',
    );
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await new PaymentNotificationDeliveries1787380000000().up(runner);
    await runner.release();
  });

  afterAll(async () => dataSource?.destroy());

  it('recovers eligible rows once in deterministic created-at/id pages with delivery-only jobs', async () => {
    process.env.PAYMENT_NOTIFICATION_DELIVERY_ENABLED = 'true';
    const queued = new Set<string>();
    const payloads: { deliveryId: string }[] = [];
    const jobIds: string[] = [];
    const queue = {
      getJob: jest.fn((id: string) => Promise.resolve(queued.has(id))),
      add: jest.fn(
        (
          _name: string,
          payload: { deliveryId: string },
          options: { jobId: string },
        ) => {
          queued.add(payload.deliveryId);
          payloads.push(payload);
          jobIds.push(options.jobId);
          return Promise.resolve();
        },
      ),
    };
    const insert = async (
      number: number,
      status: string,
      options: {
        createdAt?: string;
        nextAttemptAt?: string;
        queuedAt?: string;
      } = {},
    ) => {
      const id = uuid(number);
      const batchId = uuid(10_000 + number);
      await dataSource.query(
        'INSERT INTO "voucher_batches" ("id", "status") VALUES ($1, \'PAID\')',
        [batchId],
      );
      await dataSource.query(
        `INSERT INTO "payment_notification_deliveries"
          ("id", "voucher_batch_id", "recipient_kind", "context_snapshot", "status", "attempt_count", "enqueue_attempt_count", "last_error_classification", "last_error_message", "next_attempt_at", "queued_at", "sent_at", "created_at", "updated_at")
         VALUES ($1, $2, 'BUYER', $3, $4, 0, 0,
           CASE WHEN $4 IN ('RETRYABLE_FAILED', 'DEAD_LETTER') THEN 'QUEUE_FAILURE' END,
           CASE WHEN $4 IN ('RETRYABLE_FAILED', 'DEAD_LETTER') THEN 'queue failure' END,
           $5, $6, CASE WHEN $4 = 'SENT' THEN now() END, $7, $7)`,
        [
          id,
          batchId,
          context(batchId),
          status,
          options.nextAttemptAt ?? null,
          options.queuedAt ?? null,
          options.createdAt ?? '2026-01-01T00:00:00.000Z',
        ],
      );
      return id;
    };

    const pending = await Promise.all(
      Array.from({ length: 102 }, (_, index) => insert(102 - index, 'PENDING')),
    );
    const dueRetry = await insert(103, 'RETRYABLE_FAILED', {
      nextAttemptAt: '2020-01-01T00:00:00.000Z',
    });
    const staleQueued = await insert(104, 'QUEUED', {
      queuedAt: '2020-01-01T00:00:00.000Z',
    });
    await Promise.all([
      insert(105, 'SENT'),
      insert(106, 'DEAD_LETTER'),
      insert(107, 'RETRYABLE_FAILED', {
        nextAttemptAt: '2999-01-01T00:00:00.000Z',
      }),
      insert(108, 'QUEUED', { queuedAt: new Date().toISOString() }),
    ]);
    const expected = [...pending, dueRetry, staleQueued].sort();
    const dispatcher = new PaymentNotificationDispatcherService(
      queue,
      dataSource,
    );

    const dispatch = jest.spyOn(dispatcher, 'dispatchAfterCommit');
    await Promise.all([
      dispatcher.recoverPending(),
      dispatcher.recoverPending(),
    ]);

    expect(dispatch.mock.calls.map(([deliveryId]) => deliveryId)).toEqual(
      expected,
    );
    expect(queue.add).toHaveBeenCalledTimes(104);
    expect(new Set(queued)).toEqual(new Set(expected));
    expect(payloads.map((payload) => Object.keys(payload))).toEqual(
      expected.map(() => ['deliveryId']),
    );
    expect(jobIds.sort()).toEqual(expected);
    const excluded = await dataSource.query<{ status: string }[]>(
      `SELECT "status" FROM "payment_notification_deliveries"
       WHERE "id" = ANY($1::uuid[]) ORDER BY "id"`,
      [[uuid(105), uuid(106), uuid(107), uuid(108)]],
    );
    expect(excluded.map((row) => row.status)).toEqual([
      'SENT',
      'DEAD_LETTER',
      'RETRYABLE_FAILED',
      'QUEUED',
    ]);
  });
});
