import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportInstitutionEntitlement1787000000011 implements MigrationInterface {
  name = 'ReportInstitutionEntitlement1787000000011';
  // PostgreSQL must commit the new enum value before the following constraint can use it.
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "reports_entitlement_source_enum" ADD VALUE IF NOT EXISTS 'INSTITUTION'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_entitlement_voucher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_entitlement_voucher" CHECK (("entitlement_source" = 'VOUCHER' AND "voucher_id" IS NOT NULL) OR ("entitlement_source" IN ('GOOGLE_PLAY', 'INSTITUTION') AND "voucher_id" IS NULL))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "reports" WHERE "entitlement_source" = 'INSTITUTION'
        ) THEN
          RAISE EXCEPTION 'Cannot revert institution report entitlement while institution-entitled reports exist';
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_entitlement_voucher"`,
    );
    await queryRunner.query(
      `ALTER TYPE "reports_entitlement_source_enum" RENAME TO "reports_entitlement_source_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "reports_entitlement_source_enum" AS ENUM ('GOOGLE_PLAY', 'VOUCHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "entitlement_source" TYPE "reports_entitlement_source_enum" USING "entitlement_source"::text::"reports_entitlement_source_enum"`,
    );
    await queryRunner.query(`DROP TYPE "reports_entitlement_source_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_entitlement_voucher" CHECK (("entitlement_source" = 'VOUCHER' AND "voucher_id" IS NOT NULL) OR ("entitlement_source" = 'GOOGLE_PLAY' AND "voucher_id" IS NULL))`,
    );
  }
}
