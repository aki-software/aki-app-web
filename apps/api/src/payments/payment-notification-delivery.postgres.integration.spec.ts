import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config.js';
import { PaymentNotificationDeliveries1787380000000 } from '../migrations/1787380000000-PaymentNotificationDeliveries.js';
import { PaymentNotificationDelivery } from './entities/payment-notification-delivery.entity.js';

const migrationPath = resolve(
  __dirname,
  '../migrations/1787380000000-PaymentNotificationDeliveries.ts',
);
const postgresIntegration =
  process.env.PAYMENT_POSTGRES_INTEGRATION === 'true' &&
  Boolean(process.env.PAYMENT_TEST_DATABASE_URL);

const context = JSON.stringify({
  version: 1,
  voucherBatchId: 'batch',
  checkoutAttemptId: 'checkout',
  paymentEventId: 'event',
  institution: {},
  buyer: {},
  commercial: {},
  charged: {},
  payment: {},
  fulfilledAt: '2026-01-01T00:00:00.000Z',
});

const deliverySql = (
  overrides = '',
) => `INSERT INTO "payment_notification_deliveries"
  ("voucher_batch_id", "recipient_kind", "context_snapshot", "status", "attempt_count", "enqueue_attempt_count"${overrides})
  VALUES ('00000000-0000-0000-0000-000000000010', 'BUYER', $1::jsonb, 'PENDING', 0, 0${
    overrides
      ? ', ' +
        overrides
          .split(',')
          .map(() => '$2')
          .join(', ')
      : ''
  })`;

describe('PaymentNotificationDeliveries schema', () => {
  it('defines the additive delivery table, immutable snapshot trigger, and access indexes', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE "payment_notification_deliveries"');
    expect(sql).toContain('UQ_payment_notification_deliveries_batch_kind');
    expect(sql).toContain('FK_payment_notification_deliveries_batch');
    expect(sql).toContain('FK_payment_notification_deliveries_recipient_user');
    expect(sql).toContain('CHK_payment_notification_deliveries_context');
    expect(sql).toContain('TRG_payment_notification_deliveries_immutable');
    expect(sql).toContain('IDX_payment_notification_deliveries_recovery');
    expect(sql).toContain('IDX_payment_notification_deliveries_queued');
    expect(sql).toContain('IDX_payment_notification_deliveries_recipient_user');
    expect(sql).not.toMatch(/INSERT\s+INTO[\s\S]*SELECT/i);
  });

  it('registers delivery metadata while retaining per-migration transactions', () => {
    expect(typeOrmConfig.entities).toContain(PaymentNotificationDelivery);
    expect(typeOrmConfig.migrationsTransactionMode).toBe('each');
    expect(typeOrmConfig.synchronize).toBe(false);
  });

  it('uses text-plus-CHECK lifecycle and safe recipient atomicity', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain(
      "'PENDING', 'QUEUED', 'SENT', 'RETRYABLE_FAILED', 'DEAD_LETTER'",
    );
    expect(sql).toContain(
      "'RECIPIENT_UNRESOLVED', 'QUEUE_FAILURE', 'RENDER_FAILURE', 'TRANSPORT_TRANSIENT', 'TRANSPORT_PERMANENT'",
    );
    expect(sql).toContain('jsonb_typeof("context_snapshot") = \'object\'');
    expect(sql).toContain('recipient snapshot fields must resolve atomically');
    expect(sql).toContain('recipient snapshot is immutable after resolution');
  });
});

const describePostgres = postgresIntegration ? describe : describe.skip;
describePostgres('PaymentNotificationDeliveries PostgreSQL 15 runtime', () => {
  let dataSource: DataSource;
  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PAYMENT_TEST_DATABASE_URL,
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
    await dataSource.query(
      "INSERT INTO \"users\" VALUES ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@example.test', 'ADMIN', NULL)",
    );
    await dataSource.query(
      "INSERT INTO \"voucher_batches\" VALUES ('00000000-0000-0000-0000-000000000010', 'PAID', now(), now())",
    );
    await dataSource.query(
      "INSERT INTO \"payment_event\" VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'PAID', now())",
    );
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await new PaymentNotificationDeliveries1787380000000().up(runner);
    await runner.release();
  });
  afterAll(async () => dataSource?.destroy());

  it('enforces the migration contract on PostgreSQL and preserves rows on down', async () => {
    expect(
      (
        await dataSource.query(
          'SELECT count(*)::int AS count FROM "payment_notification_deliveries"',
        )
      )[0].count,
    ).toBe(0);
    await dataSource.query(deliverySql(), [context]);
    await expect(dataSource.query(deliverySql(), [context])).rejects.toThrow();
    for (const sql of [
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot") VALUES ('00000000-0000-0000-0000-000000000010','OTHER',$1::jsonb)`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot","status") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN',$1::jsonb,'OTHER')`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot","last_error_classification") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN',$1::jsonb,'OTHER')`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot","attempt_count") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN',$1::jsonb,9)`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN','[]')`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN','{"version":1}')`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","context_snapshot") VALUES ('00000000-0000-0000-0000-000000000099','PLATFORM_ADMIN',$1::jsonb)`,
      `INSERT INTO "payment_notification_deliveries" ("voucher_batch_id","recipient_kind","recipient_user_id","recipient_email_snapshot","recipient_name_snapshot","recipient_resolved_at","context_snapshot") VALUES ('00000000-0000-0000-0000-000000000010','PLATFORM_ADMIN','00000000-0000-0000-0000-000000000099','missing@example.test','Missing',now(),$1::jsonb)`,
    ])
      await expect(dataSource.query(sql, [context])).rejects.toThrow();
    await expect(
      dataSource.query(
        `UPDATE "payment_notification_deliveries" SET "recipient_user_id" = '00000000-0000-0000-0000-000000000001' WHERE "recipient_kind" = 'BUYER'`,
      ),
    ).rejects.toThrow();
    await dataSource.query(
      `UPDATE "payment_notification_deliveries" SET "recipient_user_id" = '00000000-0000-0000-0000-000000000001', "recipient_email_snapshot" = 'buyer@example.test', "recipient_name_snapshot" = 'Buyer', "recipient_resolved_at" = now() WHERE "recipient_kind" = 'BUYER'`,
    );
    for (const sql of [
      '"recipient_email_snapshot" = \'changed@example.test\'',
      '"context_snapshot" = $1::jsonb',
      '"voucher_batch_id" = \'00000000-0000-0000-0000-000000000099\'',
      '"recipient_kind" = \'PLATFORM_ADMIN\'',
    ])
      await expect(
        dataSource.query(
          `UPDATE "payment_notification_deliveries" SET ${sql} WHERE "recipient_kind" = 'BUYER'`,
          [
            JSON.stringify({
              ...JSON.parse(context),
              buyer: { changed: true },
            }),
          ],
        ),
      ).rejects.toThrow();
    const names = (
      await dataSource.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename IN ('payment_notification_deliveries','users','voucher_batches','payment_event')`,
      )
    ).map((row: { indexname: string }) => row.indexname);
    expect(names).toEqual(
      expect.arrayContaining([
        'IDX_payment_notification_deliveries_recipient_user',
        'IDX_payment_notification_deliveries_recovery',
        'IDX_payment_notification_deliveries_queued',
        'IDX_users_active_admin_recipient',
        'IDX_voucher_batches_paid_ledger',
        'IDX_payment_event_batch_status_created',
      ]),
    );
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await new PaymentNotificationDeliveries1787380000000().down(runner);
    await runner.release();
    expect(
      (
        await dataSource.query(
          'SELECT count(*)::int AS count FROM "payment_notification_deliveries"',
        )
      )[0].count,
    ).toBe(1);
  });
});
