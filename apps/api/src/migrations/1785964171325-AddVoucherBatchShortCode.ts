import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoucherBatchShortCode1785964171325 implements MigrationInterface {
    name = 'AddVoucherBatchShortCode1785964171325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "voucher_batches" ADD "short_code" character varying(10)`);
        await queryRunner.query(`UPDATE "voucher_batches" SET "short_code" = UPPER(SUBSTRING(id::text FROM 1 FOR 6)) WHERE "short_code" IS NULL`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" ALTER COLUMN "short_code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" ADD CONSTRAINT "UQ_b439f82996effd1808370cd7fd5" UNIQUE ("short_code")`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN', 'PATIENT')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_voucher_batches_short_code" ON "voucher_batches" ("short_code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_voucher_batches_short_code"`);
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" DROP CONSTRAINT "UQ_b439f82996effd1808370cd7fd5"`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" DROP COLUMN "short_code"`);
    }

}
