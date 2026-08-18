import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanonicalReportContentFields1787000000010 implements MigrationInterface {
  name = 'AddCanonicalReportContentFields1787000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vocational_category"
        ADD COLUMN IF NOT EXISTS "occupations" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "formal_professions" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "competencies" text[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      ALTER TABLE "tres_areas_combinations"
        ADD COLUMN IF NOT EXISTS "competencies" text[] NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tres_areas_combinations"
        DROP COLUMN IF EXISTS "competencies"
    `);
    await queryRunner.query(`
      ALTER TABLE "vocational_category"
        DROP COLUMN IF EXISTS "competencies",
        DROP COLUMN IF EXISTS "formal_professions",
        DROP COLUMN IF EXISTS "occupations"
    `);
  }
}
