import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillGooglePlayPaymentEvents1789131700516 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO payment_event (id, status, gateway, "externalPaymentId", "createdAt", "updatedAt", "session_id")
      SELECT 
        uuid_generate_v4(), 
        'APPROVED', 
        'GOOGLE_PLAY', 
        report_unlock_purchase_token, 
        created_at, 
        created_at, 
        id
      FROM sessions 
      WHERE channel = 'GOOGLE_PLAY' 
        AND report_unlock_purchase_token IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM payment_event pe WHERE pe."session_id" = sessions.id
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM payment_event 
      WHERE gateway = 'GOOGLE_PLAY' 
        AND "session_id" IS NOT NULL;
    `);
  }
}
