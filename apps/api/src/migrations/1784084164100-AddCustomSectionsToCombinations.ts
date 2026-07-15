import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomSectionsToCombinations1784084164100 implements MigrationInterface {
    name = 'AddCustomSectionsToCombinations1784084164100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tres_areas_combinations" ADD "custom_sections" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "session_results" ALTER COLUMN "percentage" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`);
        await queryRunner.query(`ALTER TABLE "session_results" ALTER COLUMN "percentage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tres_areas_combinations" DROP COLUMN "custom_sections"`);
    }

}
