import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillGooglePlayPaymentStatus1787350000000 implements MigrationInterface {
  name = 'BackfillGooglePlayPaymentStatus1787350000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "sessions"
       SET "payment_status" = 'PAID',
           "paid_at" = COALESCE("paid_at", "report_unlocked_at")
       WHERE "report_unlock_purchase_token" IS NOT NULL
         AND "report_unlocked_at" IS NOT NULL
         AND "payment_status" = 'PENDING'`,
    );
  }

  async down(): Promise<void> {
    // Forward-safe: verified Google Play settlements must remain paid.
  }
}
