import { MigrationInterface, QueryRunner } from 'typeorm';

export class GooglePlayFinancialTracking1789100000000 implements MigrationInterface {
  name = 'GooglePlayFinancialTracking1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add nullable session_id FK column to payment_event
    //    Allows B2C Google Play payment events to reference the unlocked session
    //    without breaking existing B2B voucher-batch events (they remain NULL).
    await queryRunner.query(
      `ALTER TABLE "payment_event" ADD COLUMN "session_id" UUID`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event"
       ADD CONSTRAINT "FK_payment_event_session"
       FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL`,
    );

    // 2. Add channel column to sessions with a CHECK constraint.
    //    VOUCHER = redeemed via B2B institution voucher
    //    GOOGLE_PLAY = purchased individually via Android in-app billing
    //    DIRECT_WEB = purchased individually via web checkout
    //    NULL is allowed for legacy sessions created before this migration.
    await queryRunner.query(
      `ALTER TABLE "sessions"
       ADD COLUMN "channel" VARCHAR(32)
       CHECK ("channel" IN ('VOUCHER', 'GOOGLE_PLAY', 'DIRECT_WEB'))`,
    );

    // 3. Composite index on sessions(channel, created_at) to support efficient
    //    channel-scoped dashboard queries.
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_channel_created_at"
       ON "sessions" ("channel", "created_at")`,
    );

    // 4. Data migration: assign GOOGLE_PLAY channel and clear the ghost
    //    therapist ownership for all historical mobile B2C sessions.
    //    A session is identified as a Google Play B2C session when it has a
    //    purchase token but no voucher, which means it was never a B2B session.
    await queryRunner.query(
      `UPDATE "sessions"
       SET "channel" = 'GOOGLE_PLAY',
           "therapist_user_id" = NULL
       WHERE "report_unlock_purchase_token" IS NOT NULL
         AND "voucher_id" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse data migration (best-effort; production rollback requires manual review)
    await queryRunner.query(
      `UPDATE "sessions"
       SET "channel" = NULL,
           "therapist_user_id" = NULL
       WHERE "channel" = 'GOOGLE_PLAY'`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_sessions_channel_created_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "channel"`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment_event"
       DROP CONSTRAINT IF EXISTS "FK_payment_event_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_event" DROP COLUMN IF EXISTS "session_id"`,
    );
  }
}
