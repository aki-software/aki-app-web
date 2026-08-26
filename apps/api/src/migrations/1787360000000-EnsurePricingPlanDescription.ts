import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePricingPlanDescription1787360000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "pricing_plan" ADD COLUMN IF NOT EXISTS "description" text',
    );
  }

  public down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    // Intentionally no-op: dropping descriptions after they have been written is
    // destructive, so this additive migration remains forward-safe on rollback.
    return Promise.resolve();
  }
}
