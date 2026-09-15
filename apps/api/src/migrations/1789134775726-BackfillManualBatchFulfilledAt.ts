import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillManualBatchFulfilledAt1789134775726 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE voucher_batches
            SET fulfilled_at = paid_at
            WHERE total_price = '0' AND fulfilled_at IS NULL AND paid_at IS NOT NULL;
        `);
  }

  public async down(): Promise<void> {}
}
