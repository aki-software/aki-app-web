import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportStoragePendingSince1793045800000 implements MigrationInterface {
  name = 'ReportStoragePendingSince1793045800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "storage_pending_since" TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" DROP COLUMN IF EXISTS "storage_pending_since"`,
    );
  }
}
