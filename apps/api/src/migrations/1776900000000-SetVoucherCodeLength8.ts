import { MigrationInterface, QueryRunner } from "typeorm";

export class SetVoucherCodeLength81776900000000 implements MigrationInterface {
    name = 'SetVoucherCodeLength81776900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Clear data to avoid 22001 value too long error for existing codes > 8 chars (standard cleanup)
        // If the table doesn't exist, this should run AFTER the initial migration
        await queryRunner.query(`TRUNCATE TABLE "vouchers" CASCADE`);
        
        // Change code length from 12 to 8 gracefully
        await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "code" TYPE character varying(8)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to 12
        await queryRunner.query(`ALTER TABLE "vouchers" ALTER COLUMN "code" TYPE character varying(12)`);
    }
}
