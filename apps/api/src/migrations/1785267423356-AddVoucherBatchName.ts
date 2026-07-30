import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1785267423356 implements MigrationInterface {
  name = 'Migrations1785267423356';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_institutions" DROP CONSTRAINT "FK_user_institutions_institution_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" DROP CONSTRAINT "FK_user_institutions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failed_login_attempts"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD "name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{ "likedToDisliked": 0, "dislikedToLiked": 0 }'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" ADD CONSTRAINT "FK_d7a5a3abedf8e03a0cba655906f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" ADD CONSTRAINT "FK_d55bbbde2b43aa3e3f9ea72457b" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_institutions" DROP CONSTRAINT "FK_d55bbbde2b43aa3e3f9ea72457b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" DROP CONSTRAINT "FK_d7a5a3abedf8e03a0cba655906f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_metrics" ALTER COLUMN "reverted_direction" SET DEFAULT '{"dislikedToLiked": 0, "likedToDisliked": 0}'`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_batches" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "locked_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failed_login_attempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" ADD CONSTRAINT "FK_user_institutions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_institutions" ADD CONSTRAINT "FK_user_institutions_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
