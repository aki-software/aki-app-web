import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSessionMetrics1777200000000 implements MigrationInterface {
  name = 'CreateSessionMetrics1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'session_metrics',
        columns: [
          {
            name: 'session_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'total_duration_ms',
            type: 'bigint',
          },
          {
            name: 'total_swipes',
            type: 'int',
          },
          {
            name: 'unique_cards',
            type: 'int',
          },
          {
            name: 'reverted_matches',
            type: 'int',
          },
          {
            name: 'avg_time_between_swipes_ms',
            type: 'int',
          },
          {
            name: 'min_time_between_swipes_ms',
            type: 'int',
          },
          {
            name: 'max_time_between_swipes_ms',
            type: 'int',
          },
          {
            name: 'reliability_score',
            type: 'numeric',
            precision: 5,
            scale: 2,
          },
          {
            name: 'reliability_level',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'calculated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'session_metrics',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sessions',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('session_metrics');
  }
}
