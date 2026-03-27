import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyVoucherOwnershipInstitution1776300000000
  implements MigrationInterface
{
  name = 'UnifyVoucherOwnershipInstitution1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "CHK_voucher_batches_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "CHK_voucher_batches_owner" CHECK (
        ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
        ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL)
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "CHK_vouchers_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "CHK_vouchers_owner" CHECK (
        ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
        ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL)
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "CHK_vouchers_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "CHK_vouchers_owner" CHECK (
        ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
        ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL AND "owner_user_id" IS NULL)
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "CHK_voucher_batches_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "CHK_voucher_batches_owner" CHECK (
        ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
        ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL AND "owner_user_id" IS NULL)
      )`,
    );
  }
}
