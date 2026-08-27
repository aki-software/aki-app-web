import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckoutAttempts1787370000000 implements MigrationInterface {
  name = 'CreateCheckoutAttempts1787370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "checkout_attempts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_institution_id" uuid NOT NULL,
        "buyer_user_id" uuid NOT NULL,
        "gateway" text NOT NULL,
        "state" text NOT NULL DEFAULT 'CREATED',
        "client_key_digest" varchar(64),
        "request_fingerprint" varchar(64) NOT NULL,
        "commercial_snapshot" jsonb NOT NULL,
        "voucher_batch_id" uuid UNIQUE,
        "provider_checkout_id" text,
        "provider_checkout_url" text,
        "provider_error_code" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_checkout_attempts_gateway" CHECK ("gateway" IN ('MERCADO_PAGO', 'STRIPE')),
        CONSTRAINT "CHK_checkout_attempts_state" CHECK ("state" IN ('CREATED', 'PROVIDER_CREATING', 'READY', 'FAILED', 'OUTCOME_UNKNOWN')),
        CONSTRAINT "CHK_checkout_attempts_client_key_digest" CHECK ("client_key_digest" IS NULL OR "client_key_digest" ~ '^[0-9a-f]{64}$'),
        CONSTRAINT "CHK_checkout_attempts_request_fingerprint" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
        CONSTRAINT "FK_checkout_attempts_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_checkout_attempts_buyer_user" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_checkout_attempts_voucher_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_checkout_attempts_tenant_client_key_digest" ON "checkout_attempts" ("owner_institution_id", "client_key_digest") WHERE "client_key_digest" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_checkout_attempts_tenant_state" ON "checkout_attempts" ("owner_institution_id", "state")',
    );
    await queryRunner.query(
      'ALTER TABLE "payment_event" ADD COLUMN "checkout_attempt_id" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "payment_event" ADD CONSTRAINT "FK_payment_event_checkout_attempt" FOREIGN KEY ("checkout_attempt_id") REFERENCES "checkout_attempts"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_payment_event_checkout_attempt_id" ON "payment_event" ("checkout_attempt_id")',
    );
    await queryRunner.query(`
      ALTER TABLE "checkout_attempts"
      ADD CONSTRAINT "CHK_checkout_attempts_complete_commercial_snapshot" CHECK (
        jsonb_typeof("commercial_snapshot") = 'object'
        AND "commercial_snapshot"->>'kind' = 'COMPLETE'
        AND "commercial_snapshot"->>'gateway' = "gateway"
        AND "commercial_snapshot" ?& ARRAY['pricingPlanId', 'planName', 'voucherQuantity', 'listedUsd', 'charged', 'gateway']
        AND jsonb_typeof("commercial_snapshot"->'listedUsd') = 'object'
        AND jsonb_typeof("commercial_snapshot"->'listedUsd'->'amountMinor') = 'string'
        AND "commercial_snapshot"->'listedUsd'->>'amountMinor' ~ '^(0|[1-9][0-9]*)$'
        AND "commercial_snapshot"->'listedUsd'->>'currency' = 'USD'
        AND jsonb_typeof("commercial_snapshot"->'charged') = 'object'
        AND jsonb_typeof("commercial_snapshot"->'charged'->'amountMinor') = 'string'
        AND "commercial_snapshot"->'charged'->>'amountMinor' ~ '^(0|[1-9][0-9]*)$'
        AND (("gateway" = 'STRIPE'
          AND "commercial_snapshot"->'charged'->>'currency' = 'USD'
          AND NOT "commercial_snapshot" ?| ARRAY['fxRate', 'fxQuotedAt', 'fxSource'])
          OR ("gateway" = 'MERCADO_PAGO'
            AND "commercial_snapshot"->'charged'->>'currency' = 'ARS'
            AND "commercial_snapshot" ?& ARRAY['fxRate', 'fxQuotedAt', 'fxSource']
            AND jsonb_typeof("commercial_snapshot"->'fxRate') = 'string'
            AND "commercial_snapshot"->>'fxRate' ~ '^(?:0\\.[0-9]*[1-9]|[1-9][0-9]*(?:\\.[0-9]*[1-9])?)$'
            AND jsonb_typeof("commercial_snapshot"->'fxQuotedAt') = 'string'
            AND "commercial_snapshot"->>'fxQuotedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$'
            AND ("commercial_snapshot"->>'fxQuotedAt')::timestamptz IS NOT NULL
            AND jsonb_typeof("commercial_snapshot"->'fxSource') = 'string'
            AND "commercial_snapshot"->>'fxSource' ~ '^[A-Z0-9_]{1,64}$'))
      )
    `);
    await queryRunner.query(`
      CREATE FUNCTION "checkout_attempts_prevent_immutable_updates"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD."owner_institution_id" IS DISTINCT FROM NEW."owner_institution_id"
          OR OLD."buyer_user_id" IS DISTINCT FROM NEW."buyer_user_id"
          OR OLD."gateway" IS DISTINCT FROM NEW."gateway"
          OR OLD."client_key_digest" IS DISTINCT FROM NEW."client_key_digest"
          OR OLD."request_fingerprint" IS DISTINCT FROM NEW."request_fingerprint"
          OR OLD."commercial_snapshot" IS DISTINCT FROM NEW."commercial_snapshot" THEN
          RAISE EXCEPTION 'checkout attempts identity and commercial snapshot are immutable';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_checkout_attempts_immutable"
      BEFORE UPDATE ON "checkout_attempts"
      FOR EACH ROW EXECUTE FUNCTION "checkout_attempts_prevent_immutable_updates"()
    `);
  }

  /** Checkout attempts and payment-event links are durable financial facts. */
  public down(_queryRunner?: QueryRunner): Promise<void> {
    void _queryRunner;
    // Intentionally no-op: never drop durable checkout data or its schema.
    return Promise.resolve();
  }
}
