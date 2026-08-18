import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportDelivery1787000000006 implements MigrationInterface {
  name = 'ReportDelivery1787000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "report_deliveries_status_enum" AS ENUM('PENDING', 'DELIVERED', 'FAILED')`,
    );
    await queryRunner.query(`CREATE TABLE "report_deliveries" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "report_id" uuid NOT NULL,
      "recipient_email" text NOT NULL,
      "status" "report_deliveries_status_enum" NOT NULL DEFAULT 'PENDING',
      "attempts" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_report_deliveries" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_report_deliveries_report_recipient" UNIQUE ("report_id", "recipient_email"),
      CONSTRAINT "FK_report_deliveries_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "report_deliveries"`);
    await queryRunner.query(`DROP TYPE "report_deliveries_status_enum"`);
  }
}
