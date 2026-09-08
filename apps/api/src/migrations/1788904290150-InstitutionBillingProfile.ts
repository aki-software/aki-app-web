/*
eslint-disable
*/
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionBillingProfile1788904290150 implements MigrationInterface {
  name = 'InstitutionBillingProfile1788904290150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_checkout_attempts_voucher_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_checkout_attempts_buyer_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_checkout_attempts_owner_institution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP CONSTRAINT "FK_payment_event_checkout_attempt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP CONSTRAINT "FK_252d812f8f4e9cf2fb70ffc9b2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_fulfillment_outbox" DROP CONSTRAINT "FK_payment_fulfillment_outbox_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "FK_payment_notification_deliveries_recipient_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "FK_payment_notification_deliveries_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_entitled_patient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_voucher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_entitled_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_grants" DROP CONSTRAINT "FK_report_grants_report"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" DROP CONSTRAINT "FK_report_access_audits_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" DROP CONSTRAINT "FK_report_access_audits_grant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" DROP CONSTRAINT "FK_report_access_audits_report"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_deliveries" DROP CONSTRAINT "FK_report_deliveries_report"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_patients_institution_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_active_admin_recipient"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_paid_ledger"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_sessions_report_unlock_purchase_token"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_attempts_tenant_client_key_digest"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_event_batch_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_event_checkout_attempt_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_notification_deliveries_recovery"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_notification_deliveries_queued"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_gateway"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_client_key_digest"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_request_fingerprint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_provider_idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "CHK_checkout_attempts_complete_commercial_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_error"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_counts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_recipient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_context"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "CHK_payment_notification_deliveries_lifecycle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_available_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_grants" DROP CONSTRAINT "CHK_report_grants_scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" DROP CONSTRAINT "CHK_report_access_audits_scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "UQ_payment_notification_deliveries_batch_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_deliveries" DROP CONSTRAINT "UQ_report_deliveries_report_recipient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP COLUMN "rawPayload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD "legal_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD "tax_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD "tax_condition" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD "billing_address" text`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_fulfillment_outbox" DROP CONSTRAINT "UQ_payment_fulfillment_outbox_batch"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_fulfillment_outbox_batch" ON "payment_fulfillment_outbox" ("voucher_batch_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_notification_deliveries_batch_kind" ON "payment_notification_deliveries" ("voucher_batch_id", "recipient_kind") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_report_deliveries_report_recipient" ON "report_deliveries" ("report_id", "recipient_email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_59addee476e87f6afada47fa91a" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_ba5790ca347a2db40da309d0834" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_b28334069f750fc7c70eaa882a2" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD CONSTRAINT "FK_252d812f8f4e9cf2fb70ffc9b2e" FOREIGN KEY ("voucherBatchId") REFERENCES "voucher_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD CONSTRAINT "FK_177f6995afe6b73519fdc7e7eb2" FOREIGN KEY ("checkout_attempt_id") REFERENCES "checkout_attempts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "FK_7a1220ba4083431ac4ae0530700" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "FK_3993b665436dc12e3f476b9906b" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_a38d50b0bf81ced11d7c025f316" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_ad33316c584c3ba018a116087b2" FOREIGN KEY ("entitled_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_cdb94f7e0419cf7afc4d1b9a4a2" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_cdb94f7e0419cf7afc4d1b9a4a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_ad33316c584c3ba018a116087b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_a38d50b0bf81ced11d7c025f316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "FK_3993b665436dc12e3f476b9906b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" DROP CONSTRAINT "FK_7a1220ba4083431ac4ae0530700"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP CONSTRAINT "FK_177f6995afe6b73519fdc7e7eb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP CONSTRAINT "FK_252d812f8f4e9cf2fb70ffc9b2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_b28334069f750fc7c70eaa882a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_ba5790ca347a2db40da309d0834"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" DROP CONSTRAINT "FK_59addee476e87f6afada47fa91a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_report_deliveries_report_recipient"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_notification_deliveries_batch_kind"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_fulfillment_outbox_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_fulfillment_outbox" ADD CONSTRAINT "UQ_payment_fulfillment_outbox_batch" UNIQUE ("voucher_batch_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN', 'PATIENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "billing_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "tax_condition"`,
    );
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "tax_id"`);
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "legal_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD "rawPayload" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_deliveries" ADD CONSTRAINT "UQ_report_deliveries_report_recipient" UNIQUE ("report_id", "recipient_email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "UQ_payment_notification_deliveries_batch_kind" UNIQUE ("voucher_batch_id", "recipient_kind")`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD CONSTRAINT "CHK_report_access_audits_scope" CHECK ((scope = ANY (ARRAY['PATIENT'::text, 'THERAPIST'::text, 'INSTITUTION'::text, 'ADMIN'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_grants" ADD CONSTRAINT "CHK_report_grants_scope" CHECK ((scope = ANY (ARRAY['PATIENT'::text, 'THERAPIST'::text, 'INSTITUTION'::text, 'ADMIN'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_available_metadata" CHECK (((status <> 'AVAILABLE'::reports_status_enum) OR ((object_key IS NOT NULL) AND (content_hash IS NOT NULL) AND (generated_at IS NOT NULL) AND (available_until IS NOT NULL))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_version" CHECK ((version > 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_lifecycle" CHECK ((((status = 'SENT'::text) = (sent_at IS NOT NULL)) AND (((status = ANY (ARRAY['RETRYABLE_FAILED'::text, 'DEAD_LETTER'::text])) AND (last_error_classification IS NOT NULL) AND (btrim(last_error_message) <> ''::text)) OR ((status <> ALL (ARRAY['RETRYABLE_FAILED'::text, 'DEAD_LETTER'::text])) AND (last_error_classification IS NULL) AND (last_error_message IS NULL))) AND ((status = 'RETRYABLE_FAILED'::text) = (next_attempt_at IS NOT NULL))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_context" CHECK (((jsonb_typeof(context_snapshot) = 'object'::text) AND ((context_snapshot ->> 'version'::text) = '1'::text) AND (context_snapshot ?& ARRAY['voucherBatchId'::text, 'checkoutAttemptId'::text, 'paymentEventId'::text, 'institution'::text, 'buyer'::text, 'commercial'::text, 'charged'::text, 'payment'::text, 'fulfilledAt'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_recipient" CHECK ((((recipient_resolved_at IS NULL) AND (recipient_user_id IS NULL) AND (recipient_email_snapshot IS NULL) AND (recipient_name_snapshot IS NULL)) OR ((recipient_resolved_at IS NOT NULL) AND (recipient_user_id IS NOT NULL) AND (btrim(recipient_email_snapshot) <> ''::text) AND (btrim(recipient_name_snapshot) <> ''::text))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_counts" CHECK ((((attempt_count >= 0) AND (attempt_count <= 8)) AND ((enqueue_attempt_count >= 0) AND (enqueue_attempt_count <= 8))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_error" CHECK (((last_error_classification IS NULL) OR (last_error_classification = ANY (ARRAY['RECIPIENT_UNRESOLVED'::text, 'QUEUE_FAILURE'::text, 'RENDER_FAILURE'::text, 'TRANSPORT_TRANSIENT'::text, 'TRANSPORT_PERMANENT'::text]))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_status" CHECK ((status = ANY (ARRAY['PENDING'::text, 'QUEUED'::text, 'SENT'::text, 'RETRYABLE_FAILED'::text, 'DEAD_LETTER'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "CHK_payment_notification_deliveries_kind" CHECK ((recipient_kind = ANY (ARRAY['BUYER'::text, 'PLATFORM_ADMIN'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_complete_commercial_snapshot" CHECK (((jsonb_typeof(commercial_snapshot) = 'object'::text) AND ((commercial_snapshot ->> 'kind'::text) = 'COMPLETE'::text) AND ((commercial_snapshot ->> 'gateway'::text) = gateway) AND (commercial_snapshot ?& ARRAY['pricingPlanId'::text, 'planName'::text, 'voucherQuantity'::text, 'listedUsd'::text, 'charged'::text, 'gateway'::text]) AND (jsonb_typeof((commercial_snapshot -> 'listedUsd'::text)) = 'object'::text) AND (jsonb_typeof(((commercial_snapshot -> 'listedUsd'::text) -> 'amountMinor'::text)) = 'string'::text) AND (((commercial_snapshot -> 'listedUsd'::text) ->> 'amountMinor'::text) ~ '^(0|[1-9][0-9]*)$'::text) AND (((commercial_snapshot -> 'listedUsd'::text) ->> 'currency'::text) = 'USD'::text) AND (jsonb_typeof((commercial_snapshot -> 'charged'::text)) = 'object'::text) AND (jsonb_typeof(((commercial_snapshot -> 'charged'::text) -> 'amountMinor'::text)) = 'string'::text) AND (((commercial_snapshot -> 'charged'::text) ->> 'amountMinor'::text) ~ '^(0|[1-9][0-9]*)$'::text) AND (((gateway = 'STRIPE'::text) AND (((commercial_snapshot -> 'charged'::text) ->> 'currency'::text) = 'USD'::text) AND (NOT (commercial_snapshot ?| ARRAY['fxRate'::text, 'fxQuotedAt'::text, 'fxSource'::text]))) OR ((gateway = 'MERCADO_PAGO'::text) AND (((commercial_snapshot -> 'charged'::text) ->> 'currency'::text) = 'ARS'::text) AND (commercial_snapshot ?& ARRAY['fxRate'::text, 'fxQuotedAt'::text, 'fxSource'::text]) AND (jsonb_typeof((commercial_snapshot -> 'fxRate'::text)) = 'string'::text) AND ((commercial_snapshot ->> 'fxRate'::text) ~ '^(?:0\.[0-9]*[1-9]|[1-9][0-9]*(?:\.[0-9]*[1-9])?)$'::text) AND (jsonb_typeof((commercial_snapshot -> 'fxQuotedAt'::text)) = 'string'::text) AND ((commercial_snapshot ->> 'fxQuotedAt'::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$'::text) AND (((commercial_snapshot ->> 'fxQuotedAt'::text))::timestamp with time zone IS NOT NULL) AND (jsonb_typeof((commercial_snapshot -> 'fxSource'::text)) = 'string'::text) AND ((commercial_snapshot ->> 'fxSource'::text) ~ '^[A-Z0-9_]{1,64}$'::text)))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_provider_idempotency_key" CHECK (((provider_idempotency_key)::text ~ '^[A-Za-z0-9_-]{43}$'::text))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_request_fingerprint" CHECK (((request_fingerprint)::text ~ '^[0-9a-f]{64}$'::text))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_client_key_digest" CHECK (((client_key_digest IS NULL) OR ((client_key_digest)::text ~ '^[0-9a-f]{64}$'::text)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_state" CHECK ((state = ANY (ARRAY['CREATED'::text, 'PROVIDER_CREATING'::text, 'READY'::text, 'FAILED'::text, 'OUTCOME_UNKNOWN'::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "CHK_checkout_attempts_gateway" CHECK ((gateway = ANY (ARRAY['MERCADO_PAGO'::text, 'STRIPE'::text])))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_notification_deliveries_queued" ON "payment_notification_deliveries" ("id", "queued_at") WHERE (status = 'QUEUED'::text)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_notification_deliveries_recovery" ON "payment_notification_deliveries" ("id", "next_attempt_at", "created_at") WHERE (status = ANY (ARRAY['PENDING'::text, 'RETRYABLE_FAILED'::text]))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_event_checkout_attempt_id" ON "payment_event" ("checkout_attempt_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_event_batch_status_created" ON "payment_event" ("id", "status", "voucherBatchId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_checkout_attempts_tenant_client_key_digest" ON "checkout_attempts" ("owner_institution_id", "client_key_digest") WHERE (client_key_digest IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_sessions_report_unlock_purchase_token" ON "sessions" ("report_unlock_purchase_token") WHERE (report_unlock_purchase_token IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_paid_ledger" ON "voucher_batches" ("id", "paid_at", "fulfilled_at") WHERE (status = 'PAID'::voucher_batches_status_enum)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_active_admin_recipient" ON "users" ("id", "name", "email") WHERE ((role = 'ADMIN'::users_role_enum) AND (deleted_at IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_patients_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_deliveries" ADD CONSTRAINT "FK_report_deliveries_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD CONSTRAINT "FK_report_access_audits_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD CONSTRAINT "FK_report_access_audits_grant" FOREIGN KEY ("grant_id") REFERENCES "report_grants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD CONSTRAINT "FK_report_access_audits_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_grants" ADD CONSTRAINT "FK_report_grants_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_entitled_user" FOREIGN KEY ("entitled_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_entitled_patient" FOREIGN KEY ("entitled_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "FK_payment_notification_deliveries_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_notification_deliveries" ADD CONSTRAINT "FK_payment_notification_deliveries_recipient_user" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_fulfillment_outbox" ADD CONSTRAINT "FK_payment_fulfillment_outbox_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD CONSTRAINT "FK_252d812f8f4e9cf2fb70ffc9b2e" FOREIGN KEY ("voucherBatchId") REFERENCES "voucher_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD CONSTRAINT "FK_payment_event_checkout_attempt" FOREIGN KEY ("checkout_attempt_id") REFERENCES "checkout_attempts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_checkout_attempts_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_checkout_attempts_buyer_user" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_attempts" ADD CONSTRAINT "FK_checkout_attempts_voucher_batch" FOREIGN KEY ("voucher_batch_id") REFERENCES "voucher_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
