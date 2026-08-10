import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionReportSkuExpectation1787000000002 implements MigrationInterface {
  name = 'SessionReportSkuExpectation1787000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "expected_report_sku" varchar(128)`,
    );
    await queryRunner.query(
      `UPDATE "sessions" s SET "expected_report_sku" = 'report_unlock_v2' WHERE s."expected_report_sku" IS NULL AND EXISTS (SELECT 1 FROM "session_results" r WHERE r."session_id" = s."id")`,
    );
  }

  async down(): Promise<void> {
    // Forward-safe: persisted expectations must survive rollback after unlocks.
  }
}
