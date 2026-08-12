import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportAccessAuditSchema1787000000004 implements MigrationInterface {
  name = 'ReportAccessAuditSchema1787000000004';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "report_access_audits_event_type_enum" AS ENUM ('REPORT_GRANT_ISSUED', 'REPORT_GRANT_RENEWED', 'REPORT_GRANT_CONSUMED', 'REPORT_DOWNLOAD_ACCESSED')`,
    );
    await queryRunner.query(`CREATE TABLE "report_access_audits" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "report_id" uuid NOT NULL, "grant_id" uuid,
      "actor_user_id" uuid, "event_type" "report_access_audits_event_type_enum" NOT NULL,
      "scope" text NOT NULL, "operation_key" text NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "PK_report_access_audits_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_report_access_audits_report" FOREIGN KEY ("report_id") REFERENCES "reports" ("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_report_access_audits_grant" FOREIGN KEY ("grant_id") REFERENCES "report_grants" ("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_report_access_audits_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
      CONSTRAINT "CHK_report_access_audits_scope" CHECK ("scope" IN ('PATIENT', 'THERAPIST', 'INSTITUTION', 'ADMIN'))
    )`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_report_access_audits_operation_key" ON "report_access_audits" ("operation_key")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_report_access_audits_report_id_occurred_at" ON "report_access_audits" ("report_id", "occurred_at")',
    );
    await queryRunner.query(
      `CREATE FUNCTION "prevent_report_access_audit_mutation"() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'report access audits are append-only'; END; $$ LANGUAGE plpgsql`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_report_access_audits_append_only" BEFORE UPDATE OR DELETE ON "report_access_audits" FOR EACH ROW EXECUTE FUNCTION "prevent_report_access_audit_mutation"()`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER "TRG_report_access_audits_append_only" ON "report_access_audits"',
    );
    await queryRunner.query(
      'DROP FUNCTION "prevent_report_access_audit_mutation"',
    );
    await queryRunner.query('DROP TABLE "report_access_audits"');
    await queryRunner.query('DROP TYPE "report_access_audits_event_type_enum"');
  }
}
