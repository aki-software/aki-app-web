import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientFirebaseUid1787000000008 implements MigrationInterface {
  name = 'AddPatientFirebaseUid1787000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "patients" ADD "firebase_uid" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "patients" ADD CONSTRAINT "UQ_patients_firebase_uid" UNIQUE ("firebase_uid")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "patients" DROP CONSTRAINT "UQ_patients_firebase_uid"',
    );
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN "firebase_uid"');
  }
}
