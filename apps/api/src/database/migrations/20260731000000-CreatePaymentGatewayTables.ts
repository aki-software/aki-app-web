import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePaymentGatewayTables20260731000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'voucher_plan',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'varchar', isNullable: true },
          { name: 'price_ars', type: 'int' },
          { name: 'price_usd', type: 'int', isNullable: true },
          { name: 'voucher_quantity', type: 'int' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'is_subscription', type: 'boolean', default: false },
          { name: 'billing_cycle', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'payment_event',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'gateway_name', type: 'varchar' },
          { name: 'gateway_payment_id', type: 'varchar' },
          { name: 'gateway_event_type', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'amount_paid', type: 'int' },
          { name: 'currency', type: 'varchar' },
          { name: 'voucher_plan_id', type: 'uuid', isNullable: true },
          { name: 'institution_id', type: 'uuid', isNullable: true },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'raw_payload', type: 'jsonb', isNullable: true },
          { name: 'processed_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'payment_event',
      new TableIndex({
        name: 'UQ_payment_event_gateway',
        columnNames: ['gateway_name', 'gateway_payment_id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      INSERT INTO voucher_plan (id, name, description, price_ars, voucher_quantity, is_active, created_at, updated_at)
      SELECT gen_random_uuid(), COALESCE(stripe_price_id, 'Legacy Plan'), stripe_price_id, 0, voucher_quantity, is_active, NOW(), NOW()
      FROM stripe_product_mappings
      WHERE voucher_quantity IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payment_event');
    await queryRunner.dropTable('voucher_plan');
  }
}
