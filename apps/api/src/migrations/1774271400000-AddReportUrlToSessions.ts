import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportUrlToSessions1774271400000 implements MigrationInterface {
  name = 'AddReportUrlToSessions1774271400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ADD "report_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "report_url"`);
  }
}
