import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePaymentReferenceUnique1780413280950 implements MigrationInterface {
  name = 'MakePaymentReferenceUnique1780413280950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_sessions_payment_reference_unique" ON "sessions" ("payment_reference") WHERE payment_reference IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_sessions_payment_reference_unique"`,
    );
  }
}
