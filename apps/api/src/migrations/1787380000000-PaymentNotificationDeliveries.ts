import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentNotificationDeliveries1787380000000 implements MigrationInterface {
  name = 'PaymentNotificationDeliveries1787380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_notification_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "voucher_batch_id" uuid NOT NULL,
        "recipient_kind" text NOT NULL,
        "recipient_user_id" uuid,
        "recipient_email_snapshot" text,
        "recipient_name_snapshot" text,
        "recipient_resolved_at" timestamptz,
        "context_snapshot" jsonb NOT NULL,
        "status" text NOT NULL DEFAULT 'PENDING',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "enqueue_attempt_count" integer NOT NULL DEFAULT 0,
        "last_error_classification" text,
        "last_error_message" text,
        "next_attempt_at" timestamptz,
        "queued_at" timestamptz,
        "last_attempt_at" timestamptz,
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payment_notification_deliveries_batch_kind" UNIQUE ("voucher_batch_id", "recipient_kind"),
        CONSTRAINT "FK_payment_notification_deliveries_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payment_notification_deliveries_recipient_user" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_payment_notification_deliveries_kind" CHECK ("recipient_kind" IN ('BUYER', 'PLATFORM_ADMIN')),
        CONSTRAINT "CHK_payment_notification_deliveries_status" CHECK ("status" IN ('PENDING', 'QUEUED', 'SENT', 'RETRYABLE_FAILED', 'DEAD_LETTER')),
        CONSTRAINT "CHK_payment_notification_deliveries_error" CHECK ("last_error_classification" IS NULL OR "last_error_classification" IN ('RECIPIENT_UNRESOLVED', 'QUEUE_FAILURE', 'RENDER_FAILURE', 'TRANSPORT_TRANSIENT', 'TRANSPORT_PERMANENT')),
        CONSTRAINT "CHK_payment_notification_deliveries_counts" CHECK ("attempt_count" BETWEEN 0 AND 8 AND "enqueue_attempt_count" BETWEEN 0 AND 8),
        CONSTRAINT "CHK_payment_notification_deliveries_recipient" CHECK (("recipient_resolved_at" IS NULL AND "recipient_user_id" IS NULL AND "recipient_email_snapshot" IS NULL AND "recipient_name_snapshot" IS NULL) OR ("recipient_resolved_at" IS NOT NULL AND "recipient_user_id" IS NOT NULL AND btrim("recipient_email_snapshot") <> '' AND btrim("recipient_name_snapshot") <> '')),
        CONSTRAINT "CHK_payment_notification_deliveries_context" CHECK (jsonb_typeof("context_snapshot") = 'object' AND "context_snapshot"->>'version' = '1' AND "context_snapshot" ?& ARRAY['voucherBatchId', 'checkoutAttemptId', 'paymentEventId', 'institution', 'buyer', 'commercial', 'charged', 'payment', 'fulfilledAt']),
        CONSTRAINT "CHK_payment_notification_deliveries_lifecycle" CHECK (("status" = 'SENT') = ("sent_at" IS NOT NULL) AND (("status" IN ('RETRYABLE_FAILED', 'DEAD_LETTER') AND "last_error_classification" IS NOT NULL AND btrim("last_error_message") <> '') OR ("status" NOT IN ('RETRYABLE_FAILED', 'DEAD_LETTER') AND "last_error_classification" IS NULL AND "last_error_message" IS NULL)) AND (("status" = 'RETRYABLE_FAILED') = ("next_attempt_at" IS NOT NULL)))
      )
    `);
    await queryRunner.query(`
      CREATE FUNCTION "payment_notification_deliveries_prevent_snapshot_updates"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD."voucher_batch_id" IS DISTINCT FROM NEW."voucher_batch_id"
          OR OLD."recipient_kind" IS DISTINCT FROM NEW."recipient_kind"
          OR OLD."context_snapshot" IS DISTINCT FROM NEW."context_snapshot" THEN
          RAISE EXCEPTION 'delivery identity and context snapshot are immutable';
        END IF;
        IF OLD."recipient_resolved_at" IS NOT NULL AND (OLD."recipient_resolved_at" IS DISTINCT FROM NEW."recipient_resolved_at" OR OLD."recipient_user_id" IS DISTINCT FROM NEW."recipient_user_id" OR OLD."recipient_email_snapshot" IS DISTINCT FROM NEW."recipient_email_snapshot" OR OLD."recipient_name_snapshot" IS DISTINCT FROM NEW."recipient_name_snapshot") THEN
          RAISE EXCEPTION 'recipient snapshot is immutable after resolution';
        END IF;
        IF OLD."recipient_resolved_at" IS NULL AND (NEW."recipient_resolved_at" IS NOT NULL OR NEW."recipient_user_id" IS NOT NULL OR NEW."recipient_email_snapshot" IS NOT NULL OR NEW."recipient_name_snapshot" IS NOT NULL) AND NOT (NEW."recipient_resolved_at" IS NOT NULL AND NEW."recipient_user_id" IS NOT NULL AND btrim(NEW."recipient_email_snapshot") <> '' AND btrim(NEW."recipient_name_snapshot") <> '') THEN
          RAISE EXCEPTION 'recipient snapshot fields must resolve atomically';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_payment_notification_deliveries_immutable"
      BEFORE UPDATE ON "payment_notification_deliveries"
      FOR EACH ROW EXECUTE FUNCTION "payment_notification_deliveries_prevent_snapshot_updates"()
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_payment_notification_deliveries_recipient_user" ON "payment_notification_deliveries" ("recipient_user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_payment_notification_deliveries_recovery" ON "payment_notification_deliveries" ("next_attempt_at", "created_at", "id") WHERE "status" IN (\'PENDING\', \'RETRYABLE_FAILED\')',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_payment_notification_deliveries_queued" ON "payment_notification_deliveries" ("queued_at", "id") WHERE "status" = \'QUEUED\'',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_users_active_admin_recipient" ON "users" ("id") INCLUDE ("name", "email") WHERE "role" = \'ADMIN\' AND "deleted_at" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_voucher_batches_paid_ledger" ON "voucher_batches" ("fulfilled_at" DESC NULLS LAST, "paid_at" DESC, "id" DESC) WHERE "status" = \'PAID\'',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_payment_event_batch_status_created" ON "payment_event" ("voucherBatchId", "status", "createdAt" DESC, "id" DESC)',
    );
  }

  /** Intentionally no-op: application rollback preserves delivery audit schema and rows. */
  public down(_queryRunner?: QueryRunner): Promise<void> {
    void _queryRunner;
    return Promise.resolve();
  }
}
