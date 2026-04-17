import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTresAreasCombinations1777000000000 implements MigrationInterface {
  name = 'CreateTresAreasCombinations1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tres_areas_combinations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "combination_key" character varying(255) NOT NULL,
        "title" character varying(255) NOT NULL,
        "area_1" character varying(120) NOT NULL,
        "area_2" character varying(120) NOT NULL,
        "area_3" character varying(120) NOT NULL,
        "narrative" text NOT NULL,
        "tendencies" text array NOT NULL DEFAULT '{}',
        "possible_jobs" text NOT NULL,
        "related_professions" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tres_areas_combinations_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tres_areas_combinations_combination_key" ON "tres_areas_combinations" ("combination_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_tres_areas_combinations_combination_key"`,
    );
    await queryRunner.query(`DROP TABLE "tres_areas_combinations"`);
  }
}
