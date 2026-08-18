import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportPatientEntitlement1787000000009
  implements MigrationInterface
{
  name = 'ReportPatientEntitlement1787000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "FK_reports_entitled_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "entitled_user_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD COLUMN "entitled_patient_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_entitled_user" FOREIGN KEY ("entitled_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_entitled_patient" FOREIGN KEY ("entitled_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_entitled_principal" CHECK (("entitled_user_id" IS NULL) <> ("entitled_patient_id" IS NULL))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_entitled_patient_id_status" ON "reports" ("entitled_patient_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "reports" WHERE "entitled_patient_id" IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'Cannot revert report patient entitlement while patient-entitled reports exist';
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `DROP INDEX "IDX_reports_entitled_patient_id_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_entitled_principal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_entitled_patient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_entitled_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP COLUMN "entitled_patient_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "entitled_user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_entitled_user" FOREIGN KEY ("entitled_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
