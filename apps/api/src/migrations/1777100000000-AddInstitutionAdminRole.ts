import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstitutionAdminRole1777100000000 implements MigrationInterface {
  name = 'AddInstitutionAdminRole1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'INSTITUTION_ADMIN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'THERAPIST' WHERE "role" = 'INSTITUTION_ADMIN'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'PATIENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::text::"public"."users_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }
}
