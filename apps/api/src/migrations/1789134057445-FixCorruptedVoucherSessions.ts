import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCorruptedVoucherSessions1789134057445 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE sessions
            SET therapist_user_id = b.owner_user_id,
                channel = 'VOUCHER'
            FROM vouchers v
            JOIN voucher_batches b ON v.batch_id = b.id
            WHERE sessions.voucher_id = v.id
              AND (
                  sessions.therapist_user_id IS DISTINCT FROM b.owner_user_id 
                  OR sessions.channel IS DISTINCT FROM 'VOUCHER'
              );
        `);
  }

  public async down(): Promise<void> {}
}
