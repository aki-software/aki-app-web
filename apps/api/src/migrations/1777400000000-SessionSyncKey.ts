import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionSyncKey1777400000000 implements MigrationInterface {
  name = 'SessionSyncKey1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN "sync_key" varchar(128)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_sessions_sync_key" ON "sessions" ("sync_key") WHERE "sync_key" IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_sessions_sync_key"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "sync_key"`);
  }
}
