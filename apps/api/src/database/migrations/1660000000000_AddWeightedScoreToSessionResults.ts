import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWeightedScoreToSessionResults1660000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'session_results',
      new TableColumn({
        name: 'weighted_score',
        type: 'double precision',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('session_results', 'weighted_score');
  }
}
