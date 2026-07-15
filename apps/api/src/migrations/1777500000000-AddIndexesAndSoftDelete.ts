import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesAndSoftDelete1777500000000 implements MigrationInterface {
  name = 'AddIndexesAndSoftDelete1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Soft Delete columns ────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD COLUMN "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP`,
    );

    // ─── Institutions ───────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX "IDX_institutions_name" ON "institutions" ("name")`,
    );

    // ─── Users ──────────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX "IDX_users_institution_id" ON "users" ("institution_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role" ON "users" ("role")`,
    );

    // ─── Sessions (institution_id + therapist_user_id already exist in DB) ───
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_payment_status" ON "sessions" ("payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_voucher_id" ON "sessions" ("voucher_id")`,
    );
    // Composite: analytics queries filter by institution and order by date
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_institution_id_created_at" ON "sessions" ("institution_id", "created_at")`,
    );

    // ─── Vouchers (owner_institution_id + status already exist in DB) ────────
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_batch_id" ON "vouchers" ("batch_id")`,
    );
    // Composite: stock queries filter by owner institution AND status together
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_institution_id_status" ON "vouchers" ("owner_institution_id", "status")`,
    );

    // ─── Voucher Batches (owner_institution_id already exists in DB) ─────────
    // Composite: panel queries list batches by institution filtered by status
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_institution_id_status" ON "voucher_batches" ("owner_institution_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Voucher Batches ─────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX "IDX_voucher_batches_owner_institution_id_status"`,
    );

    // ─── Vouchers ───────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX "IDX_vouchers_owner_institution_id_status"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_vouchers_batch_id"`);

    // ─── Sessions ───────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX "IDX_sessions_institution_id_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_sessions_voucher_id"`);
    await queryRunner.query(`DROP INDEX "IDX_sessions_payment_status"`);

    // ─── Users ──────────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX "IDX_users_role"`);
    await queryRunner.query(`DROP INDEX "IDX_users_institution_id"`);

    // ─── Institutions ───────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX "IDX_institutions_name"`);

    // ─── Soft Delete columns ────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "deleted_at"`,
    );
  }
}
