import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionStatusAndIndexes1789000000000 implements MigrationInterface {
  name = 'SessionStatusAndIndexes1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type and add columns
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_status_enum" AS ENUM('STARTED', 'COMPLETED', 'ABANDONED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "status" "public"."sessions_status_enum" NOT NULL DEFAULT 'STARTED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );

    // 2. Create missing indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_completed_at" ON "sessions" ("completed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_patient_id" ON "sessions" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_created_at_payment_status" ON "sessions" ("created_at", "payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_status_redeemed_at" ON "vouchers" ("status", "redeemed_at")`,
    );

    // 3. Backfill script for completed sessions
    await queryRunner.query(
      `UPDATE "sessions" 
       SET "status" = 'COMPLETED', 
           "completed_at" = "created_at"
       WHERE EXISTS (
         SELECT 1 FROM "session_results" "sr" WHERE "sr"."session_id" = "sessions"."id"
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vouchers_status_redeemed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_sessions_created_at_payment_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_sessions_patient_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sessions_completed_at"`);

    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "completed_at"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum"`);
  }
}
