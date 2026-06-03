import { MigrationInterface, QueryRunner } from 'typeorm';

export class TimestampsToTimestamptz1780451337572 implements MigrationInterface {
  name = 'TimestampsToTimestamptz1780451337572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert existing TIMESTAMP columns to TIMESTAMP WITH TIME ZONE.
    // The existing values are interpreted as UTC (consistent with how the
    // application has been storing them); the AT TIME ZONE 'UTC' clause makes
    // the conversion explicit and lossless.
    await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "calculated_at" TYPE TIMESTAMP WITH TIME ZONE USING "calculated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_setup_expires_at" TYPE TIMESTAMP WITH TIME ZONE USING "password_setup_expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_set_at" TYPE TIMESTAMP WITH TIME ZONE USING "password_set_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_reset_expires_at" TYPE TIMESTAMP WITH TIME ZONE USING "password_reset_expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "institutions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "institutions" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "voucher_batches" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "voucher_batches" ALTER COLUMN "paid_at" TYPE TIMESTAMP WITH TIME ZONE USING "paid_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "sent_at" TYPE TIMESTAMP WITH TIME ZONE USING "sent_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "redeemed_at" TYPE TIMESTAMP WITH TIME ZONE USING "redeemed_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "expires_at" TYPE TIMESTAMP WITH TIME ZONE USING "expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "session_date" TYPE TIMESTAMP WITH TIME ZONE USING "session_date" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "report_unlocked_at" TYPE TIMESTAMP WITH TIME ZONE USING "report_unlocked_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "paid_at" TYPE TIMESTAMP WITH TIME ZONE USING "paid_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "session_swipes" ALTER COLUMN "timestamp" TYPE TIMESTAMP WITH TIME ZONE USING "timestamp" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vocational_category" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vocational_category" ALTER COLUMN "updatedAt" TYPE TIMESTAMP WITH TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "tres_areas_combinations" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "tres_areas_combinations" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to TIMESTAMP WITHOUT TIME ZONE. The reverse conversion is
    // also lossless: timestamptz values get formatted using the session's
    // TimeZone setting, but the underlying UTC instant is preserved.
    await queryRunner.query(`ALTER TABLE "tres_areas_combinations" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "tres_areas_combinations" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vocational_category" ALTER COLUMN "updatedAt" TYPE TIMESTAMP WITHOUT TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vocational_category" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITHOUT TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "session_swipes" ALTER COLUMN "timestamp" TYPE TIMESTAMP WITHOUT TIME ZONE USING "timestamp" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "paid_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "paid_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "report_unlocked_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "report_unlocked_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "session_date" TYPE TIMESTAMP WITHOUT TIME ZONE USING "session_date" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "expires_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "redeemed_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "redeemed_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "sent_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "sent_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "voucher_batches" ALTER COLUMN "paid_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "paid_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "voucher_batches" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "institutions" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "institutions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "updated_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "created_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_reset_expires_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "password_reset_expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_set_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "password_set_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_setup_expires_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "password_setup_expires_at" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "calculated_at" TYPE TIMESTAMP WITHOUT TIME ZONE USING "calculated_at" AT TIME ZONE 'UTC'`);
  }
}
