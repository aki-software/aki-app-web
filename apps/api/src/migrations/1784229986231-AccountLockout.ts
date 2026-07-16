import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountLockout1784229986231 implements MigrationInterface {
    name = 'AccountLockout1784229986231'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "failed_login_attempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "locked_until" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_attempts"`);
    }

}
