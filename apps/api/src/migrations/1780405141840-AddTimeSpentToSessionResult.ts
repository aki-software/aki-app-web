import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimeSpentToSessionResult1780405141840 implements MigrationInterface {
  name = 'AddTimeSpentToSessionResult1780405141840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_institution_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_institutions_responsible_therapist"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_voucher_batches_owner_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_voucher_batches_owner_institution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_batch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_owner_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_owner_institution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_redeemed_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_voucher_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_therapist_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_institution_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP CONSTRAINT "FK_session_results_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_swipes" DROP CONSTRAINT "FK_session_swipes_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_owner_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_owner_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vouchers_owner_institution_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sessions_sync_key"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_session_results_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_session_swipes_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "CHK_voucher_batches_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "CHK_vouchers_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD "time_spent_ms" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "calculated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_owner_institution_id_status"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_owner_type_enum" RENAME TO "voucher_owner_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_batches_owner_type_enum" AS ENUM('THERAPIST', 'INSTITUTION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "owner_type" TYPE "public"."voucher_batches_owner_type_enum" USING "owner_type"::"text"::"public"."voucher_batches_owner_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_batch_status_enum" RENAME TO "voucher_batch_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_batches_status_enum" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" TYPE "public"."voucher_batches_status_enum" USING "status"::"text"::"public"."voucher_batches_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."voucher_batch_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vouchers_owner_institution_id_status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vouchers_owner_type_enum" AS ENUM('THERAPIST', 'INSTITUTION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "owner_type" TYPE "public"."vouchers_owner_type_enum" USING "owner_type"::"text"::"public"."vouchers_owner_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."voucher_owner_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_status_enum" RENAME TO "voucher_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vouchers_status_enum" AS ENUM('AVAILABLE', 'SENT', 'USED', 'EXPIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" TYPE "public"."vouchers_status_enum" USING "status"::"text"::"public"."vouchers_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."voucher_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "UQ_59153b538a49254d44f32d8f8f9" UNIQUE ("sync_key")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."session_payment_status_enum" RENAME TO "session_payment_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_payment_status_enum" AS ENUM('PENDING', 'PAID', 'VOUCHER_REDEEMED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" TYPE "public"."sessions_payment_status_enum" USING "payment_status"::"text"::"public"."sessions_payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."session_payment_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_institution_id_status" ON "voucher_batches" ("owner_institution_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_efc30b2b9169e05e0e1e19d6dd" ON "vouchers" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_institution_id_status" ON "vouchers" ("owner_institution_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_31d2d6b638d4b396937d392278" ON "session_results" ("session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c4ab13fd6a4c4d62a91c0e932" ON "session_swipes" ("session_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_822972ceea1fda0973b8acc7bbe" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_29d0ccfb71ec6aef28e68ec4c97" FOREIGN KEY ("responsible_therapist_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_684695a073df2293d062be97485" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_0c1d6d6fd3395052c8834f670df" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_a1a521f31aa74ec151da9a70809" FOREIGN KEY ("batch_id") REFERENCES "voucher_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_adf923f7defdbfa1a05efeac191" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_181f1983341ea5ed5ec20c71d4a" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_e1650be52548e7b86dab96e1c91" FOREIGN KEY ("redeemed_session_id") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_8159d85a4925c5d04f1725d780e" FOREIGN KEY ("therapist_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_355cf5b7df327d6b1aece8cfb87" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_579c47c03a6dc4a9f65f55e0e09" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD CONSTRAINT "FK_31d2d6b638d4b396937d3922789" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_swipes" ADD CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session_swipes" DROP CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP CONSTRAINT "FK_31d2d6b638d4b396937d3922789"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_579c47c03a6dc4a9f65f55e0e09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_355cf5b7df327d6b1aece8cfb87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_8159d85a4925c5d04f1725d780e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_e1650be52548e7b86dab96e1c91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_181f1983341ea5ed5ec20c71d4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_adf923f7defdbfa1a05efeac191"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_a1a521f31aa74ec151da9a70809"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_0c1d6d6fd3395052c8834f670df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_684695a073df2293d062be97485"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_29d0ccfb71ec6aef28e68ec4c97"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_822972ceea1fda0973b8acc7bbe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c4ab13fd6a4c4d62a91c0e932"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_31d2d6b638d4b396937d392278"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vouchers_owner_institution_id_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_efc30b2b9169e05e0e1e19d6dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_owner_institution_id_status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."session_payment_status_enum_old" AS ENUM('PENDING', 'PAID', 'VOUCHER_REDEEMED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" TYPE "public"."session_payment_status_enum_old" USING "payment_status"::"text"::"public"."session_payment_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."sessions_payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."session_payment_status_enum_old" RENAME TO "session_payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "UQ_59153b538a49254d44f32d8f8f9"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_status_enum_old" AS ENUM('AVAILABLE', 'SENT', 'USED', 'EXPIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" TYPE "public"."voucher_status_enum_old" USING "status"::"text"::"public"."voucher_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."vouchers_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_status_enum_old" RENAME TO "voucher_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_owner_type_enum_old" AS ENUM('THERAPIST', 'INSTITUTION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ALTER COLUMN "owner_type" TYPE "public"."voucher_owner_type_enum_old" USING "owner_type"::"text"::"public"."voucher_owner_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."vouchers_owner_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_owner_type_enum_old" RENAME TO "voucher_owner_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_institution_id_status" ON "vouchers" ("owner_institution_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_batch_status_enum_old" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" TYPE "public"."voucher_batch_status_enum_old" USING "status"::"text"::"public"."voucher_batch_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."voucher_batches_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_batch_status_enum_old" RENAME TO "voucher_batch_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_owner_type_enum_old" AS ENUM('THERAPIST', 'INSTITUTION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ALTER COLUMN "owner_type" TYPE "public"."voucher_owner_type_enum_old" USING "owner_type"::"text"::"public"."voucher_owner_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."voucher_batches_owner_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."voucher_owner_type_enum_old" RENAME TO "voucher_owner_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_institution_id_status" ON "voucher_batches" ("owner_institution_id", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "calculated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP COLUMN "time_spent_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "CHK_vouchers_owner" CHECK ((((owner_type = 'THERAPIST'::voucher_owner_type_enum) AND (owner_user_id IS NOT NULL) AND (owner_institution_id IS NULL)) OR ((owner_type = 'INSTITUTION'::voucher_owner_type_enum) AND (owner_institution_id IS NOT NULL))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "CHK_voucher_batches_owner" CHECK ((((owner_type = 'THERAPIST'::voucher_owner_type_enum) AND (owner_user_id IS NOT NULL) AND (owner_institution_id IS NULL)) OR ((owner_type = 'INSTITUTION'::voucher_owner_type_enum) AND (owner_institution_id IS NOT NULL))))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_swipes_session_id" ON "session_swipes" ("session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_results_session_id" ON "session_results" ("session_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_sessions_sync_key" ON "sessions" ("sync_key") WHERE (sync_key IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_vouchers_code" ON "vouchers" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_institution_id" ON "vouchers" ("owner_institution_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_user_id" ON "vouchers" ("owner_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_user_id" ON "voucher_batches" ("owner_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "session_swipes" ADD CONSTRAINT "FK_session_swipes_session_id" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD CONSTRAINT "FK_session_results_session_id" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_therapist_user_id" FOREIGN KEY ("therapist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_voucher_id" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_redeemed_session" FOREIGN KEY ("redeemed_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_batch_id" FOREIGN KEY ("batch_id") REFERENCES "voucher_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_voucher_batches_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_voucher_batches_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_institutions_responsible_therapist" FOREIGN KEY ("responsible_therapist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
