import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameVoucherPurchaserToOwner1776400000000 implements MigrationInterface {
  name = 'RenameVoucherPurchaserToOwner1776400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_purchaser_type_enum')
        AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_owner_type_enum') THEN
          ALTER TYPE "public"."voucher_purchaser_type_enum" RENAME TO "voucher_owner_type_enum";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'purchaser_type') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "purchaser_type" TO "owner_type";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'purchaser_user_id') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "purchaser_user_id" TO "owner_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'purchaser_institution_id') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "purchaser_institution_id" TO "owner_institution_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'purchaser_type') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "purchaser_type" TO "owner_type";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'purchaser_user_id') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "purchaser_user_id" TO "owner_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'purchaser_institution_id') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "purchaser_institution_id" TO "owner_institution_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_voucher_batches_purchaser') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "CHK_voucher_batches_purchaser" TO "CHK_voucher_batches_owner";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_vouchers_purchaser') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "CHK_vouchers_purchaser" TO "CHK_vouchers_owner";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_voucher_batches_purchaser_user') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "FK_voucher_batches_purchaser_user" TO "FK_voucher_batches_owner_user";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_voucher_batches_purchaser_institution') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "FK_voucher_batches_purchaser_institution" TO "FK_voucher_batches_owner_institution";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vouchers_purchaser_user') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "FK_vouchers_purchaser_user" TO "FK_vouchers_owner_user";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vouchers_purchaser_institution') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "FK_vouchers_purchaser_institution" TO "FK_vouchers_owner_institution";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_voucher_batches_purchaser_user_id') THEN
          ALTER INDEX "IDX_voucher_batches_purchaser_user_id" RENAME TO "IDX_voucher_batches_owner_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_voucher_batches_purchaser_institution_id') THEN
          ALTER INDEX "IDX_voucher_batches_purchaser_institution_id" RENAME TO "IDX_voucher_batches_owner_institution_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_vouchers_purchaser_user_id') THEN
          ALTER INDEX "IDX_vouchers_purchaser_user_id" RENAME TO "IDX_vouchers_owner_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_vouchers_purchaser_institution_id') THEN
          ALTER INDEX "IDX_vouchers_purchaser_institution_id" RENAME TO "IDX_vouchers_owner_institution_id";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_voucher_batches_owner_user_id') THEN
          ALTER INDEX "IDX_voucher_batches_owner_user_id" RENAME TO "IDX_voucher_batches_purchaser_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_voucher_batches_owner_institution_id') THEN
          ALTER INDEX "IDX_voucher_batches_owner_institution_id" RENAME TO "IDX_voucher_batches_purchaser_institution_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_vouchers_owner_user_id') THEN
          ALTER INDEX "IDX_vouchers_owner_user_id" RENAME TO "IDX_vouchers_purchaser_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_vouchers_owner_institution_id') THEN
          ALTER INDEX "IDX_vouchers_owner_institution_id" RENAME TO "IDX_vouchers_purchaser_institution_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_voucher_batches_owner') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "CHK_voucher_batches_owner" TO "CHK_voucher_batches_purchaser";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_vouchers_owner') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "CHK_vouchers_owner" TO "CHK_vouchers_purchaser";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_voucher_batches_owner_user') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "FK_voucher_batches_owner_user" TO "FK_voucher_batches_purchaser_user";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_voucher_batches_owner_institution') THEN
          ALTER TABLE "voucher_batches" RENAME CONSTRAINT "FK_voucher_batches_owner_institution" TO "FK_voucher_batches_purchaser_institution";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vouchers_owner_user') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "FK_vouchers_owner_user" TO "FK_vouchers_purchaser_user";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vouchers_owner_institution') THEN
          ALTER TABLE "vouchers" RENAME CONSTRAINT "FK_vouchers_owner_institution" TO "FK_vouchers_purchaser_institution";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'owner_type') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "owner_type" TO "purchaser_type";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'owner_user_id') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "owner_user_id" TO "purchaser_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voucher_batches' AND column_name = 'owner_institution_id') THEN
          ALTER TABLE "voucher_batches" RENAME COLUMN "owner_institution_id" TO "purchaser_institution_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'owner_type') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "owner_type" TO "purchaser_type";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'owner_user_id') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "owner_user_id" TO "purchaser_user_id";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'owner_institution_id') THEN
          ALTER TABLE "vouchers" RENAME COLUMN "owner_institution_id" TO "purchaser_institution_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_owner_type_enum')
        AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_purchaser_type_enum') THEN
          ALTER TYPE "public"."voucher_owner_type_enum" RENAME TO "voucher_purchaser_type_enum";
        END IF;
      END $$;
    `);
  }
}
