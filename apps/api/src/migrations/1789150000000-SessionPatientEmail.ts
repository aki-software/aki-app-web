import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionPatientEmail1789150000000 implements MigrationInterface {
  name = 'SessionPatientEmail1789150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "patient_email" character varying(320)`,
    );
    await queryRunner.query(
      `UPDATE "sessions" AS session
       SET "patient_email" = patient."email"
       FROM "patients" AS patient
       WHERE session."patient_id" = patient."id"
         AND session."patient_email" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "patient_email"`,
    );
  }
}
