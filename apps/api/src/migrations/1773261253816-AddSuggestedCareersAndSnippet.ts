import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuggestedCareersAndSnippet1773261253816 implements MigrationInterface {
    name = 'AddSuggestedCareersAndSnippet1773261253816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_results" ADD "suggested_careers" json`);
        await queryRunner.query(`ALTER TABLE "session_results" ADD "material_snippet" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_results" DROP COLUMN "material_snippet"`);
        await queryRunner.query(`ALTER TABLE "session_results" DROP COLUMN "suggested_careers"`);
    }

}
