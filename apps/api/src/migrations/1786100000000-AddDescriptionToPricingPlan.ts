import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDescriptionToPricingPlan1786100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'pricing_plan',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pricing_plan', 'description');
  }
}
