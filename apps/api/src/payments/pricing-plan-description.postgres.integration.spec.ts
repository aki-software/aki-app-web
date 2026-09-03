import { DataSource, QueryRunner } from 'typeorm';
import { EnsurePricingPlanDescription1787360000000 } from '../migrations/1787360000000-EnsurePricingPlanDescription.js';

const integration = process.env.PAYMENT_POSTGRES_INTEGRATION === 'true';
const describeIntegration = integration ? describe : describe.skip;
const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;

jest.setTimeout(30_000);

describeIntegration('Pricing plan description PostgreSQL migration', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error(
        'PAYMENT_TEST_DATABASE_URL is required when PAYMENT_POSTGRES_INTEGRATION=true',
      );
    }
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await dataSource.initialize();
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query('CREATE SCHEMA pricing_description_test');
    await queryRunner.query(
      'SET LOCAL search_path TO pricing_description_test, public',
    );
    await queryRunner.query(
      'CREATE TABLE pricing_plan (id uuid PRIMARY KEY, name text NOT NULL)',
    );
    await queryRunner.query(
      "INSERT INTO pricing_plan (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Starter')",
    );
    await queryRunner.query(
      'CREATE TABLE voucher_batches (id uuid PRIMARY KEY, settlement_marker text NOT NULL)',
    );
    await queryRunner.query(
      "INSERT INTO voucher_batches (id, settlement_marker) VALUES ('22222222-2222-2222-2222-222222222222', 'untouched')",
    );
  });

  afterEach(async () => {
    if (!queryRunner) return;
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    if (!queryRunner.isReleased) await queryRunner.release();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('adds a nullable description while preserving legacy pricing and settlement data', async () => {
    await applyMigration(queryRunner);

    await expect(descriptionColumn(queryRunner)).resolves.toEqual({
      data_type: 'text',
      is_nullable: 'YES',
    });
    await expect(
      queryRunner.query('SELECT name, description FROM pricing_plan'),
    ).resolves.toEqual([{ name: 'Starter', description: null }]);
    await expect(
      queryRunner.query('SELECT settlement_marker FROM voucher_batches'),
    ).resolves.toEqual([{ settlement_marker: 'untouched' }]);
  });

  it('is idempotent and preserves an existing description', async () => {
    await queryRunner.query(
      'ALTER TABLE pricing_plan ADD COLUMN description text',
    );
    await queryRunner.query(
      "UPDATE pricing_plan SET description = 'Existing plan details'",
    );

    await applyMigration(queryRunner);
    await applyMigration(queryRunner);

    await expect(
      queryRunner.query('SELECT description FROM pricing_plan'),
    ).resolves.toEqual([{ description: 'Existing plan details' }]);
  });

  it('keeps descriptions after its forward-safe down path', async () => {
    await applyMigration(queryRunner);
    await queryRunner.query(
      "UPDATE pricing_plan SET description = 'Written after migration'",
    );
    await revertMigration(queryRunner);

    await expect(descriptionColumn(queryRunner)).resolves.toEqual({
      data_type: 'text',
      is_nullable: 'YES',
    });
    await expect(
      queryRunner.query('SELECT description FROM pricing_plan'),
    ).resolves.toEqual([{ description: 'Written after migration' }]);
  });
});

async function descriptionColumn(queryRunner: QueryRunner) {
  const [column] = await queryRunner.query(
    "SELECT data_type, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'pricing_plan' AND column_name = 'description'",
  );
  return column;
}

const migration = new EnsurePricingPlanDescription1787360000000();

async function applyMigration(queryRunner: QueryRunner): Promise<void> {
  await migration.up(queryRunner);
}

async function revertMigration(queryRunner: QueryRunner): Promise<void> {
  await migration.down(queryRunner);
}
