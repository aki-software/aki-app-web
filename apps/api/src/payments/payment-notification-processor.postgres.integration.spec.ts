import { DataSource } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity.js';
import { PaymentNotificationDeliveries1787380000000 } from '../migrations/1787380000000-PaymentNotificationDeliveries.js';
import { User } from '../users/entities/user.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { PaymentNotificationDelivery } from './entities/payment-notification-delivery.entity.js';
import { PaymentNotificationDeliveryStateService } from './services/payment-notification-delivery-state.service.js';

const enabled =
  process.env.PAYMENT_POSTGRES_INTEGRATION === 'true' &&
  Boolean(process.env.PAYMENT_TEST_DATABASE_URL);
const describePostgres = enabled ? describe : describe.skip;
const uuid = (number: number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const now = new Date('2026-03-01T10:00:00.000Z');

const context = (voucherBatchId: string, buyer = true) => ({
  version: 1,
  voucherBatchId,
  checkoutAttemptId: 'checkout',
  paymentEventId: 'event',
  institution: {},
  buyer: buyer
    ? { userId: uuid(901), name: 'Buyer', email: 'buyer@example.test' }
    : null,
  commercial: {},
  charged: {},
  payment: {},
  fulfilledAt: now.toISOString(),
});

describePostgres('PaymentNotificationDeliveryState PostgreSQL 15 races', () => {
  let dataSource: DataSource;
  let service: PaymentNotificationDeliveryStateService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PAYMENT_TEST_DATABASE_URL,
      dropSchema: true,
      entities: [PaymentNotificationDelivery, User, VoucherBatch, Institution],
    });
    await dataSource.initialize();
    await dataSource.query(
      'DROP FUNCTION IF EXISTS "payment_notification_deliveries_prevent_snapshot_updates"() CASCADE',
    );
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.query(
      'CREATE TABLE "users" ("id" uuid PRIMARY KEY, "name" text, "email" text, "password_hash" text, "password_setup_token" varchar, "password_setup_expires_at" timestamptz, "password_set_at" timestamptz, "password_reset_token" varchar, "password_reset_expires_at" timestamptz, "role" text, "institution_id" uuid, "created_at" timestamptz, "updated_at" timestamptz, "deleted_at" timestamptz)',
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
    service = new PaymentNotificationDeliveryStateService(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE "payment_notification_deliveries", "users", "voucher_batches" CASCADE',
    );
  });

  const insert = async (
    number: number,
    status = 'PENDING',
    options: Record<string, unknown> = {},
  ) => {
    const id = uuid(number);
    const batchId = uuid(1000 + number);
    await dataSource.query(
      'INSERT INTO "voucher_batches" ("id", "status") VALUES ($1, $2)',
      [batchId, 'PAID'],
    );
    await dataSource.query(
      `INSERT INTO "payment_notification_deliveries"
       ("id", "voucher_batch_id", "recipient_kind", "context_snapshot", "status", "attempt_count", "enqueue_attempt_count", "last_attempt_at", "next_attempt_at", "recipient_user_id", "recipient_email_snapshot", "recipient_name_snapshot", "recipient_resolved_at", "last_error_classification", "last_error_message")
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        batchId,
        options.kind ?? 'PLATFORM_ADMIN',
        context(batchId, options.buyer !== false),
        status,
        options.attemptCount ?? 0,
        options.lastAttemptAt ?? null,
        options.nextAttemptAt ?? null,
        options.recipientUserId ?? null,
        options.email ?? null,
        options.name ?? null,
        options.resolvedAt ?? null,
        status === 'RETRYABLE_FAILED' ? 'RECIPIENT_UNRESOLVED' : null,
        status === 'RETRYABLE_FAILED'
          ? 'No eligible platform administrator'
          : null,
      ],
    );
    return id;
  };

  it('allows exactly one concurrent claim and permits due retries despite recent attempts', async () => {
    const id = await insert(1);
    const claims = await Promise.all([
      service.claim(id, now),
      service.claim(id, now),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(
      (
        await dataSource.query(
          'SELECT "attempt_count" FROM "payment_notification_deliveries" WHERE id = $1',
          [id],
        )
      )[0].attempt_count,
    ).toBe(1);

    const due = await insert(2, 'RETRYABLE_FAILED', {
      lastAttemptAt: now,
      nextAttemptAt: new Date(now.getTime() - 1),
    });
    const notDue = await insert(3, 'RETRYABLE_FAILED', {
      nextAttemptAt: new Date(now.getTime() + 1),
    });
    await expect(service.claim(due, now)).resolves.toMatchObject({
      attemptCount: 1,
    });
    await expect(service.claim(notDue, now)).resolves.toBeUndefined();
  });

  it('resolves only valid exact-one ADMIN snapshots atomically and never redirects an existing snapshot', async () => {
    const id = await insert(4);
    const unresolvedClaim = await service.claim(id, now);
    await expect(
      service.resolveRecipient(id, unresolvedClaim!.attemptCount),
    ).resolves.toBeUndefined();
    await dataSource.query(
      'UPDATE "payment_notification_deliveries" SET "next_attempt_at" = now() - interval \'1 second\' WHERE id = $1',
      [id],
    );
    await dataSource.query(
      'INSERT INTO "users" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)',
      [uuid(401), 'Admin One', 'admin.one@example.test', 'ADMIN'],
    );
    const claimed = await service.claim(id, new Date());
    const resolutions = await Promise.all([
      service.resolveRecipient(id, claimed!.attemptCount),
      service.resolveRecipient(id, claimed!.attemptCount),
    ]);
    expect(resolutions).toEqual([
      expect.objectContaining({ recipientUserId: uuid(401) }),
      expect.objectContaining({ recipientUserId: uuid(401) }),
    ]);
    await expect(
      dataSource.query(
        'SELECT recipient_user_id, recipient_email_snapshot, recipient_name_snapshot FROM payment_notification_deliveries WHERE id = $1',
        [id],
      ),
    ).resolves.toEqual([
      {
        recipient_user_id: uuid(401),
        recipient_email_snapshot: 'admin.one@example.test',
        recipient_name_snapshot: 'Admin One',
      },
    ]);
    await dataSource.query('UPDATE "users" SET "email" = $2 WHERE id = $1', [
      uuid(401),
      'changed@example.test',
    ]);
    await dataSource.query(
      'INSERT INTO "users" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)',
      [uuid(402), 'Admin Two', 'admin.two@example.test', 'ADMIN'],
    );
    await expect(
      service.resolveRecipient(id, claimed!.attemptCount),
    ).resolves.toMatchObject({
      recipientUserId: uuid(401),
      recipientEmailSnapshot: 'admin.one@example.test',
    });

    const invalid = await insert(5);
    await dataSource.query('UPDATE "users" SET "role" = $1', ['THERAPIST']);
    await dataSource.query(
      'INSERT INTO "users" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)',
      [uuid(403), 'Bad', 'not-an-email', 'ADMIN'],
    );
    const invalidClaim = await service.claim(invalid, now);
    await expect(
      service.resolveRecipient(invalid, invalidClaim!.attemptCount),
    ).resolves.toBeUndefined();

    const multiple = await insert(6);
    await dataSource.query('UPDATE "users" SET "role" = $1', ['THERAPIST']);
    await dataSource.query(
      'INSERT INTO "users" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4), ($5, $6, $7, $4)',
      [
        uuid(404),
        'Admin Three',
        'three@example.test',
        'ADMIN',
        uuid(405),
        'Admin Four',
        'four@example.test',
      ],
    );
    const multipleClaim = await service.claim(multiple, now);
    await expect(
      service.resolveRecipient(multiple, multipleClaim!.attemptCount),
    ).resolves.toBeUndefined();
    await expect(
      dataSource.query(
        'SELECT status, last_error_classification FROM payment_notification_deliveries WHERE id = $1',
        [multiple],
      ),
    ).resolves.toEqual([
      {
        status: 'RETRYABLE_FAILED',
        last_error_classification: 'RECIPIENT_UNRESOLVED',
      },
    ]);
    await dataSource.query(
      'UPDATE "users" SET "deleted_at" = now() WHERE id = $1',
      [uuid(405)],
    );
    await dataSource.query(
      "UPDATE payment_notification_deliveries SET next_attempt_at = now() - interval '1 second' WHERE id = $1",
      [multiple],
    );
    const recoveryClaim = await service.claim(multiple, new Date());
    await expect(
      service.resolveRecipient(multiple, recoveryClaim!.attemptCount),
    ).resolves.toMatchObject({ recipientUserId: uuid(404) });
  });

  it('dead-letters exhausted/permanent failures, protects terminal rows, and documents the at-least-once crash window', async () => {
    const exhausted = await insert(6, 'QUEUED', { attemptCount: 8 });
    await service.recordFailure(
      exhausted,
      8,
      'TRANSPORT_TRANSIENT',
      'Email provider is temporarily unavailable',
    );
    expect(
      (
        await dataSource.query(
          'SELECT "status" FROM "payment_notification_deliveries" WHERE id = $1',
          [exhausted],
        )
      )[0].status,
    ).toBe('DEAD_LETTER');
    await service.markSent(exhausted, 8);
    expect(
      (
        await dataSource.query(
          'SELECT "status" FROM "payment_notification_deliveries" WHERE id = $1',
          [exhausted],
        )
      )[0].status,
    ).toBe('DEAD_LETTER');

    const permanent = await insert(7, 'QUEUED', { attemptCount: 1 });
    await service.recordFailure(
      permanent,
      1,
      'TRANSPORT_PERMANENT',
      'Email provider rejected the recipient',
      true,
    );
    expect(
      (
        await dataSource.query(
          'SELECT "status" FROM "payment_notification_deliveries" WHERE id = $1',
          [permanent],
        )
      )[0].status,
    ).toBe('DEAD_LETTER');

    // A crash after provider acceptance but before SENT can reclaim a stale lease and duplicate external delivery.
    const stale = await insert(8, 'QUEUED', {
      attemptCount: 1,
      lastAttemptAt: new Date(now.getTime() - 16 * 60_000),
    });
    await expect(service.claim(stale, now)).resolves.toMatchObject({
      attemptCount: 2,
    });
  });
});
