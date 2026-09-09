import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillingFields1788959901216 implements MigrationInterface {
    name = 'AddBillingFields1788959901216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institutions" ADD "billing_city" character varying`);
        await queryRunner.query(`ALTER TABLE "institutions" ADD "billing_province" character varying`);
        await queryRunner.query(`ALTER TABLE "institutions" ADD "billing_phone" character varying`);
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`);
        await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "billing_phone"`);
        await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "billing_province"`);
        await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "billing_city"`);
    }

}
