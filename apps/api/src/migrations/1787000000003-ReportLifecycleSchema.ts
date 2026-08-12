import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportLifecycleSchema1787000000003 implements MigrationInterface {
  name = 'ReportLifecycleSchema1787000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reports_entitlement_source_enum" AS ENUM ('GOOGLE_PLAY', 'VOUCHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "reports_status_enum" AS ENUM ('PENDING', 'GENERATING', 'AVAILABLE', 'EXPIRED', 'FAILED')`,
    );
    await queryRunner.query(`CREATE TABLE "reports" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "session_id" uuid NOT NULL,
      "entitlement_source" "reports_entitlement_source_enum" NOT NULL,
      "entitled_user_id" uuid NOT NULL,
      "voucher_id" uuid,
      "status" "reports_status_enum" NOT NULL DEFAULT 'PENDING',
      "version" integer NOT NULL DEFAULT 1,
      "object_key" text,
      "content_hash" text,
      "generated_at" TIMESTAMPTZ,
      "available_until" TIMESTAMPTZ,
      "last_accessed_at" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_reports_session" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_reports_entitled_user" FOREIGN KEY ("entitled_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_reports_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers" ("id") ON DELETE SET NULL,
      CONSTRAINT "CHK_reports_version" CHECK ("version" > 0),
      CONSTRAINT "CHK_reports_entitlement_voucher" CHECK (
        ("entitlement_source" = 'VOUCHER' AND "voucher_id" IS NOT NULL) OR
        ("entitlement_source" = 'GOOGLE_PLAY' AND "voucher_id" IS NULL)
      ),
      CONSTRAINT "CHK_reports_available_metadata" CHECK (
        "status" <> 'AVAILABLE' OR ("object_key" IS NOT NULL AND "content_hash" IS NOT NULL AND "generated_at" IS NOT NULL AND "available_until" IS NOT NULL)
      )
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_reports_session_id_version" ON "reports" ("session_id", "version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_entitled_user_id_status" ON "reports" ("entitled_user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_available_until" ON "reports" ("available_until")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_voucher_id" ON "reports" ("voucher_id")`,
    );
    await queryRunner.query(`CREATE TABLE "report_grants" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "report_id" uuid NOT NULL,
      "token_hash" text NOT NULL,
      "scope" text NOT NULL,
      "expires_at" TIMESTAMPTZ NOT NULL,
      "used_at" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_report_grants_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_report_grants_report" FOREIGN KEY ("report_id") REFERENCES "reports" ("id") ON DELETE CASCADE,
      CONSTRAINT "CHK_report_grants_scope" CHECK ("scope" IN ('PATIENT', 'THERAPIST', 'INSTITUTION', 'ADMIN'))
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_report_grants_token_hash" ON "report_grants" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_report_grants_report_id" ON "report_grants" ("report_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_report_grants_expires_at" ON "report_grants" ("expires_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "report_grants"');
    await queryRunner.query('DROP TABLE "reports"');
    await queryRunner.query('DROP TYPE "reports_status_enum"');
    await queryRunner.query('DROP TYPE "reports_entitlement_source_enum"');
  }
}
