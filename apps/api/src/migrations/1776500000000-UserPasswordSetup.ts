import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPasswordSetup1776500000000 implements MigrationInterface {
  name = 'UserPasswordSetup1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_setup_token" character varying(255),
      ADD COLUMN "password_setup_expires_at" TIMESTAMP,
      ADD COLUMN "password_set_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "password_set_at",
      DROP COLUMN "password_setup_expires_at",
      DROP COLUMN "password_setup_token"
    `);
  }
}
