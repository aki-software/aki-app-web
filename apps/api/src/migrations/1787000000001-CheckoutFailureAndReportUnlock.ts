import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckoutFailureAndReportUnlock1787000000001 implements MigrationInterface {
  name = 'CheckoutFailureAndReportUnlock1787000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_batches_status_enum" ADD VALUE IF NOT EXISTS 'FAILED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD COLUMN IF NOT EXISTS "checkout_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "report_unlock_purchase_token" varchar(2048)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sessions_report_unlock_purchase_token" ON "sessions" ("report_unlock_purchase_token") WHERE "report_unlock_purchase_token" IS NOT NULL`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot safely remove enum values after financial writes.
  }
}
