import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBehavMetrics1780600000000 implements MigrationInterface {
  name = 'AddBehavMetrics1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('session_metrics', [
      new TableColumn({
        name: 'like_ratio',
        type: 'numeric',
        precision: 5,
        scale: 4,
        isNullable: true,
      }),
      new TableColumn({
        name: 'selectivity_level',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      new TableColumn({
        name: 'first_half_like_rate',
        type: 'numeric',
        precision: 5,
        scale: 4,
        isNullable: true,
      }),
      new TableColumn({
        name: 'last_half_like_rate',
        type: 'numeric',
        precision: 5,
        scale: 4,
        isNullable: true,
      }),
      new TableColumn({
        name: 'consistency_level',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      new TableColumn({
        name: 'fatigue_detected',
        type: 'boolean',
        isNullable: true,
      }),
      new TableColumn({
        name: 'rush_detected',
        type: 'boolean',
        isNullable: true,
      }),
      new TableColumn({
        name: 'response_time_histogram',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'reverted_direction',
        type: 'jsonb',
        isNullable: true,
        default: '\'{"likedToDisliked": 0, "dislikedToLiked": 0}\'::jsonb',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('session_metrics', [
      'like_ratio',
      'selectivity_level',
      'first_half_like_rate',
      'last_half_like_rate',
      'consistency_level',
      'fatigue_detected',
      'rush_detected',
      'response_time_histogram',
      'reverted_direction',
    ]);
  }
}
