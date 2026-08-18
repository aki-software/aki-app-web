import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportInputSnapshotAndStoragePending1787000000005 implements MigrationInterface {
  name = 'ReportInputSnapshotAndStoragePending1787000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "reports_status_enum" ADD VALUE IF NOT EXISTS 'STORAGE_PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD COLUMN "input_snapshot" jsonb`,
    );
  }

  async down(): Promise<void> {
    throw new Error(
      'Report input snapshots and enum values are intentionally irreversible.',
    );
  }
}
