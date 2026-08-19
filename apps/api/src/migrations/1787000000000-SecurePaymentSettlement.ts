import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurePaymentSettlement1787000000000 implements MigrationInterface {
  name = 'SecurePaymentSettlement1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD COLUMN IF NOT EXISTS "expected_amount_minor" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD COLUMN IF NOT EXISTS "fulfilled_at" timestamptz`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_voucher_batches_institution_idempotency" ON "voucher_batches" ("owner_institution_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD COLUMN IF NOT EXISTS "payload_digest" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP CONSTRAINT IF EXISTS "UQ_b185db75a68ae755104db96e60e"`,
    );
    await queryRunner.query(
      `UPDATE "payment_event" SET "rawPayload" = NULL WHERE "rawPayload" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_event_gateway_external_payment" ON "payment_event" ("gateway", "externalPaymentId")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "payment_fulfillment_outbox" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "voucher_batch_id" uuid NOT NULL, "processed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_payment_fulfillment_outbox_batch" UNIQUE ("voucher_batch_id"), CONSTRAINT "FK_payment_fulfillment_outbox_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE CASCADE)`,
    );
  }

  public down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    // Forward-safe rollback: new cross-gateway events make restoration of the
    // legacy global reference constraint destructive or fallible. Preserve the
    // composite authority index, redacted payload state, and outbox records.
    // Intentionally no-op: schema and data remain forward-safe after new
    // writes. This migration cannot restore the legacy schema safely.
    return Promise.resolve();
  }
}
