import { DataSource } from 'typeorm';
import { SecurePaymentSettlement1787000000000 } from './1787000000000-SecurePaymentSettlement.js';
import { CheckoutFailureAndReportUnlock1787000000001 } from './1787000000001-CheckoutFailureAndReportUnlock.js';
import { SessionReportSkuExpectation1787000000002 } from './1787000000002-SessionReportSkuExpectation.js';

const integration = process.env.PAYMENT_POSTGRES_INTEGRATION === 'true';
const describeIntegration = integration ? describe : describe.skip;

describeIntegration('payments security PostgreSQL migrations', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PAYMENT_TEST_DATABASE_URL,
    });
    await dataSource.initialize();
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.query(
      `CREATE TYPE voucher_batches_status_enum AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')`,
    );
    await dataSource.query(
      `CREATE TABLE voucher_batches (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), owner_institution_id uuid, status voucher_batches_status_enum NOT NULL DEFAULT 'PENDING')`,
    );
    await dataSource.query(
      `CREATE TABLE payment_event (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "externalPaymentId" varchar NOT NULL, gateway varchar NOT NULL, "rawPayload" jsonb)`,
    );
    await dataSource.query(
      `CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())`,
    );
    await dataSource.query(
      `CREATE TABLE session_results (session_id uuid NOT NULL REFERENCES sessions(id))`,
    );
  });

  afterAll(async () => dataSource?.destroy());

  it('applies Phase 1/2 constraints, backfills only completed sessions, and keeps down forward-safe', async () => {
    const completed = await dataSource.query(
      `INSERT INTO sessions DEFAULT VALUES RETURNING id`,
    );
    const incomplete = await dataSource.query(
      `INSERT INTO sessions DEFAULT VALUES RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO session_results (session_id) VALUES ($1)`,
      [completed[0].id],
    );

    const runner = dataSource.createQueryRunner();
    await new SecurePaymentSettlement1787000000000().up(runner);
    await new CheckoutFailureAndReportUnlock1787000000001().up(runner);
    await new SessionReportSkuExpectation1787000000002().up(runner);

    await dataSource.query(
      `INSERT INTO voucher_batches (owner_institution_id, idempotency_key) VALUES ('00000000-0000-0000-0000-000000000001', 'same-key')`,
    );
    await expect(
      dataSource.query(
        `INSERT INTO voucher_batches (owner_institution_id, idempotency_key) VALUES ('00000000-0000-0000-0000-000000000001', 'same-key')`,
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        `INSERT INTO voucher_batches (status) VALUES ('FAILED')`,
      ),
    ).resolves.toBeDefined();
    await dataSource.query(
      `UPDATE sessions SET report_unlock_purchase_token = 'token-1' WHERE id = $1`,
      [completed[0].id],
    );
    await expect(
      dataSource.query(
        `UPDATE sessions SET report_unlock_purchase_token = 'token-1' WHERE id = $1`,
        [incomplete[0].id],
      ),
    ).rejects.toThrow();
    const skuRows = await dataSource.query(
      `SELECT id, expected_report_sku FROM sessions ORDER BY id`,
    );
    expect(
      skuRows.find((row: { id: string }) => row.id === completed[0].id)
        .expected_report_sku,
    ).toBe('report_unlock_v2');
    expect(
      skuRows.find((row: { id: string }) => row.id === incomplete[0].id)
        .expected_report_sku,
    ).toBeNull();

    await new CheckoutFailureAndReportUnlock1787000000001().down();
    await new SecurePaymentSettlement1787000000000().down(runner);
    expect(
      await dataSource.query(
        `SELECT checkout_url FROM voucher_batches LIMIT 1`,
      ),
    ).toHaveLength(1);
  });
});
