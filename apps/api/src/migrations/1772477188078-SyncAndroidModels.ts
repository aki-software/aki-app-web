import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncAndroidModels1772477188078 implements MigrationInterface {
    name = 'SyncAndroidModels1772477188078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" ADD "session_date" TIMESTAMP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "session_date"`);
    }

}
