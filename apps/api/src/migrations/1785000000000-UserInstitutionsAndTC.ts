import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserInstitutionsAndTC1785000000000 implements MigrationInterface {
  name = 'UserInstitutionsAndTC1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tc_accepted_at to users
    await queryRunner.query(`
      ALTER TABLE "users" ADD "tc_accepted_at" TIMESTAMPTZ
    `);

    // Create user_institutions table
    await queryRunner.query(`
      CREATE TABLE "user_institutions" (
        "user_id" uuid NOT NULL,
        "institution_id" uuid NOT NULL,
        "role" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_institutions" PRIMARY KEY ("user_id", "institution_id")
      )
    `);

    // Add Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "user_institutions"
      ADD CONSTRAINT "FK_user_institutions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_institutions"
      ADD CONSTRAINT "FK_user_institutions_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE
    `);

    // Add explicit indexes for FKs as per postgresql-table-design
    await queryRunner.query(`
      CREATE INDEX "IDX_user_institutions_user_id" ON "user_institutions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_institutions_institution_id" ON "user_institutions" ("institution_id")
    `);

    // Migrate existing data.
    await queryRunner.query(`
      INSERT INTO "user_institutions" ("user_id", "institution_id", "role", "created_at", "updated_at")
      SELECT "id", "institution_id", "role", now(), now()
      FROM "users"
      WHERE "institution_id" IS NOT NULL
    `);

    // We can safely drop the institution_id from users since it's now migrated.
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_institution_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "institution_id" CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD "institution_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      UPDATE "users" u
      SET "institution_id" = ui."institution_id"
      FROM "user_institutions" ui
      WHERE u."id" = ui."user_id"
    `);
    await queryRunner.query(`DROP TABLE "user_institutions"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tc_accepted_at"`);
  }
}
