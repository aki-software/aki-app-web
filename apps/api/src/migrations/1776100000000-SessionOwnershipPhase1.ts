import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionOwnershipPhase11776100000000 implements MigrationInterface {
  name = 'SessionOwnershipPhase11776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN "therapist_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN "institution_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_therapist_user_id" ON "sessions" ("therapist_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_institution_id" ON "sessions" ("institution_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_therapist_user_id" FOREIGN KEY ("therapist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_institution_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_therapist_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_sessions_institution_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_sessions_therapist_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "institution_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "therapist_user_id"`,
    );
  }
}
