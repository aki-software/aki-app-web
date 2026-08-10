import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePaymentGatewayTables1786000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pricing_plan',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar' },
          { name: 'voucherQuantity', type: 'int' },
          { name: 'priceUsd', type: 'decimal', precision: 10, scale: 2 },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
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
          { name: 'gateway', type: 'varchar' },
          { name: 'externalPaymentId', type: 'varchar', isUnique: true },
          { name: 'status', type: 'varchar' },
          { name: 'rawPayload', type: 'jsonb', isNullable: true },
          { name: 'voucherBatchId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'payment_event',
      new TableForeignKey({
        columnNames: ['voucherBatchId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'voucher_batches',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payment_event');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('voucherBatchId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('payment_event', foreignKey);
    }
    await queryRunner.dropTable('payment_event');
    await queryRunner.dropTable('pricing_plan');
  }
}
