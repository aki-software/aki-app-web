import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeparatePatientEntity1778000000000 implements MigrationInterface {
  name = 'SeparatePatientEntity1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create patients table
    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "password_setup_token" character varying(255),
        "password_setup_expires_at" TIMESTAMP WITH TIME ZONE,
        "password_set_at" TIMESTAMP WITH TIME ZONE,
        "password_reset_token" character varying(255),
        "password_reset_expires_at" TIMESTAMP WITH TIME ZONE,
        "institution_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_patients_email" UNIQUE ("email"),
        CONSTRAINT "PK_patients" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key to institutions
    await queryRunner.query(`
      ALTER TABLE "patients" 
      ADD CONSTRAINT "FK_patients_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_patients_institution_id" ON "patients" ("institution_id")
    `);

    // 2. Migrate existing patients from users to patients
    await queryRunner.query(`
      INSERT INTO "patients" (
        "id", "name", "email", "password_hash", 
        "password_setup_token", "password_setup_expires_at", "password_set_at",
        "password_reset_token", "password_reset_expires_at",
        "institution_id", "created_at", "updated_at", "deleted_at"
      )
      SELECT 
        "id", "name", "email", "password_hash", 
        "password_setup_token", "password_setup_expires_at", "password_set_at",
        "password_reset_token", "password_reset_expires_at",
        "institution_id", "created_at", "updated_at", "deleted_at"
      FROM "users"
      WHERE "role" = 'PATIENT'
    `);

    // 3. Update sessions.patient_id foreign key if it existed
    // Since patient_id was just a column, if there was a foreign key, we drop it.
    // If not, we don't need to do anything to sessions table since it's just a uuid column.
    // Let's assume TypeORM didn't have FK since we checked session.entity.ts and it wasn't there.

    // 4. Delete PATIENT records from users
    await queryRunner.query(`
      DELETE FROM "users" WHERE "role" = 'PATIENT'
    `);

    // 5. Remove PATIENT from user_role enum
    // PostgreSQL enum removal is tricky. Best way is to rename, create new, update, drop old.
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add PATIENT to user_role enum
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN', 'PATIENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'THERAPIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);

    // 2. Restore patients to users table
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "name", "email", "password_hash", 
        "password_setup_token", "password_setup_expires_at", "password_set_at",
        "password_reset_token", "password_reset_expires_at",
        "institution_id", "created_at", "updated_at", "deleted_at",
        "role"
      )
      SELECT 
        "id", "name", "email", "password_hash", 
        "password_setup_token", "password_setup_expires_at", "password_set_at",
        "password_reset_token", "password_reset_expires_at",
        "institution_id", "created_at", "updated_at", "deleted_at",
        'PATIENT'
      FROM "patients"
    `);

    // 3. Drop patients table
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_patients_institution_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_patients_institution_id"`,
    );
    await queryRunner.query(`DROP TABLE "patients"`);
  }
}
