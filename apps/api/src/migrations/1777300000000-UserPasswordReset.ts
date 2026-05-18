import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPasswordReset1777300000000 implements MigrationInterface {
  name = 'UserPasswordReset1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_reset_token" character varying(255),
      ADD COLUMN "password_reset_expires_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "password_reset_expires_at",
      DROP COLUMN "password_reset_token"
    `);
  }
}
