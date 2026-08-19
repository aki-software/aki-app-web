import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeyInsightToTresAreas1786566486552 implements MigrationInterface {
  name = 'AddKeyInsightToTresAreas1786566486552';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tres_areas_combinations" ADD COLUMN IF NOT EXISTS "key_insight" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tres_areas_combinations" DROP COLUMN "key_insight"`,
    );
  }
}
