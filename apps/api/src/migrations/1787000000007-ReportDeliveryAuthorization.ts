import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportDeliveryAuthorization1787000000007
  implements MigrationInterface
{
  name = 'ReportDeliveryAuthorization1787000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "report_access_audits_event_type_enum" ADD VALUE IF NOT EXISTS 'REPORT_DELIVERY_AUTHORIZED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD COLUMN "recipient_email" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_access_audits" ADD COLUMN "outcome" text`,
    );
  }

  async down(): Promise<void> {
    throw new Error('Report delivery authorization audit fields are irreversible.');
  }
}
