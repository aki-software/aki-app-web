import { DataSource } from 'typeorm';
import { CreateCheckoutAttempts1787370000000 } from '../migrations/1787370000000-CreateCheckoutAttempts.js';

const enabled = process.env.PAYMENT_POSTGRES_INTEGRATION === 'true';
const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;

if (enabled && !databaseUrl) {
  throw new Error(
    'PAYMENT_TEST_DATABASE_URL is required when integration is enabled',
  );
}

const describeIntegration = enabled ? describe : describe.skip;

jest.setTimeout(30_000);

describeIntegration('CheckoutAttempt PostgreSQL persistence', () => {
  let dataSource: DataSource;
  const migration = new CreateCheckoutAttempts1787370000000();
  const digest = 'a'.repeat(64);
  const fingerprint = 'b'.repeat(64);
  const completeSnapshot = {
    kind: 'COMPLETE',
    pricingPlanId: '33333333-3333-3333-3333-333333333333',
    planName: 'Starter',
    voucherQuantity: 10,
    listedUsd: { amountMinor: '1000', currency: 'USD' },
    charged: { amountMinor: '1000', currency: 'USD' },
    gateway: 'STRIPE',
  };
  const mercadoPagoSnapshot = {
    ...completeSnapshot,
    gateway: 'MERCADO_PAGO',
    charged: { amountMinor: '150000', currency: 'ARS' },
    fxRate: '150',
    fxQuotedAt: '2026-03-20T12:00:00.000Z',
    fxSource: 'MERCADO_PAGO',
  };

  beforeAll(async () => {
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await dataSource.initialize();
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.query(
      'CREATE TABLE institutions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())',
    );
    await dataSource.query(
      'CREATE TABLE users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())',
    );
    await dataSource.query(
      'CREATE TABLE voucher_batches (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())',
    );
    await dataSource.query(
      'CREATE TABLE payment_event (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())',
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await migration.down(dataSource.createQueryRunner()).catch(() => undefined);
    await dataSource.query('DROP TABLE IF EXISTS payment_event');
    await dataSource.query('DROP TABLE IF EXISTS checkout_attempts');
    await dataSource.query(
      'DROP FUNCTION IF EXISTS "checkout_attempts_prevent_immutable_updates"()',
    );
    await dataSource.query('DROP TABLE IF EXISTS voucher_batches');
    await dataSource.query('DROP TABLE IF EXISTS users');
    await dataSource.query('DROP TABLE IF EXISTS institutions');
    await dataSource.destroy();
  });

  it('creates foundation lifecycle, digest, uniqueness, and foreign-key persistence', async () => {
    await expect(
      dataSource.query('SELECT * FROM checkout_attempts'),
    ).rejects.toThrow();
    await migration.up(dataSource.createQueryRunner());
    const institutionA = await uuid('institutions');
    const institutionB = await uuid('institutions');
    const buyer = await uuid('users');
    const batch = await uuid('voucher_batches');
    const attempt = await insert({ institution: institutionA, buyer, batch });

    await expect(
      insert({ institution: institutionA, buyer }),
    ).rejects.toThrow();
    await expect(
      insert({ institution: institutionB, buyer }),
    ).resolves.toBeDefined();
    await expect(
      insert({
        institution: institutionB,
        buyer,
        batch,
        digest: 'c'.repeat(64),
      }),
    ).rejects.toThrow();
    await expect(
      insert({ institution: institutionA, buyer, digest: 'invalid' }),
    ).rejects.toThrow();
    await expect(
      insert({ institution: institutionA, buyer, digest: 'A'.repeat(64) }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution: institutionA,
        buyer,
        requestFingerprint: 'B'.repeat(64),
      }),
    ).rejects.toThrow();
    await expect(
      insert({ institution: institutionA, buyer, gateway: 'OTHER' }),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        "UPDATE checkout_attempts SET state = 'OTHER' WHERE id = $1",
        [attempt.id],
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        "UPDATE checkout_attempts SET state = 'READY' WHERE id = $1",
        [attempt.id],
      ),
    ).resolves.toBeDefined();
    await expect(
      insert({ institution: institutionA, buyer, digest: null }),
    ).resolves.toBeDefined();

    const event = await uuid('payment_event');
    await expect(
      dataSource.query(
        'UPDATE payment_event SET checkout_attempt_id = $1 WHERE id = $2',
        [attempt.id, event],
      ),
    ).resolves.toBeDefined();
    await expect(
      dataSource.query(
        "UPDATE payment_event SET checkout_attempt_id = '00000000-0000-0000-0000-000000000000' WHERE id = $1",
        [event],
      ),
    ).rejects.toThrow();
  });

  it('enforces COMPLETE Stripe USD and Mercado Pago USD-to-ARS snapshots', async () => {
    const institution = await uuid('institutions');
    const buyer = await uuid('users');

    await expect(
      insert({ institution, buyer, snapshot: { kind: 'COMPLETE' } }),
    ).rejects.toThrow();
    await expect(
      insert({ institution, buyer, snapshot: { kind: 'LEGACY_PARTIAL' } }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        snapshot: {
          ...completeSnapshot,
          listedUsd: { amountMinor: '1000', currency: 'EUR' },
        },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        snapshot: {
          ...completeSnapshot,
          charged: { amountMinor: '1000', currency: 'EUR' },
        },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: mercadoPagoSnapshot,
      }),
    ).resolves.toBeDefined();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: {
          ...mercadoPagoSnapshot,
          listedUsd: { amountMinor: '1000', currency: 'EUR' },
        },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: {
          ...mercadoPagoSnapshot,
          charged: { amountMinor: '150000', currency: 'USD' },
        },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: { ...mercadoPagoSnapshot, fxRate: undefined },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: { ...mercadoPagoSnapshot, fxRate: '01.2' },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: { ...mercadoPagoSnapshot, fxQuotedAt: 'not-a-datetime' },
      }),
    ).rejects.toThrow();
    await expect(
      insert({
        institution,
        buyer,
        gateway: 'MERCADO_PAGO',
        snapshot: { ...mercadoPagoSnapshot, fxSource: 'mercado pago' },
      }),
    ).rejects.toThrow();
  });

  it('prevents identity and commercial changes while allowing lifecycle updates', async () => {
    const institutionA = await uuid('institutions');
    const institutionB = await uuid('institutions');
    const buyer = await uuid('users');
    const attempt = await insert({ institution: institutionA, buyer });

    await expect(
      dataSource.query(
        'UPDATE checkout_attempts SET owner_institution_id = $1 WHERE id = $2',
        [institutionB, attempt.id],
      ),
    ).rejects.toThrow('immutable');
    await expect(
      dataSource.query(
        'UPDATE checkout_attempts SET commercial_snapshot = $1 WHERE id = $2',
        [{ ...completeSnapshot, planName: 'Changed' }, attempt.id],
      ),
    ).rejects.toThrow('immutable');
    await expect(
      dataSource.query(
        "UPDATE checkout_attempts SET state = 'READY', provider_checkout_url = 'https://provider.test/checkout' WHERE id = $1",
        [attempt.id],
      ),
    ).resolves.toBeDefined();
  });

  it('keeps all persistence protections installed when down is invoked', async () => {
    const institution = await uuid('institutions');
    const buyer = await uuid('users');
    const attempt = await insert({
      institution,
      buyer,
      digest: 'd'.repeat(64),
      requestFingerprint: 'e'.repeat(64),
    });
    const event = await uuid('payment_event');
    await dataSource.query(
      'UPDATE payment_event SET checkout_attempt_id = $1 WHERE id = $2',
      [attempt.id, event],
    );

    await migration.down(dataSource.createQueryRunner());

    await expect(
      dataSource.query('SELECT id FROM checkout_attempts WHERE id = $1', [
        attempt.id,
      ]),
    ).resolves.toEqual([{ id: attempt.id }]);
    await expect(
      dataSource.query(
        'UPDATE payment_event SET checkout_attempt_id = NULL WHERE id = $1',
        [event],
      ),
    ).resolves.toBeDefined();
    await expect(
      dataSource.query(`
        SELECT c.is_nullable FROM information_schema.columns c
        WHERE c.table_name = 'payment_event' AND c.column_name = 'checkout_attempt_id'
      `),
    ).resolves.toEqual([{ is_nullable: 'YES' }]);
    await expect(
      dataSource.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('checkout_attempts', 'payment_event')
          AND indexname IN ('IDX_checkout_attempts_tenant_client_key_digest', 'IDX_checkout_attempts_tenant_state', 'IDX_payment_event_checkout_attempt_id')
        ORDER BY indexname
      `),
    ).resolves.toEqual([
      { indexname: 'IDX_checkout_attempts_tenant_client_key_digest' },
      { indexname: 'IDX_checkout_attempts_tenant_state' },
      { indexname: 'IDX_payment_event_checkout_attempt_id' },
    ]);
    await expect(
      dataSource.query(`
        SELECT t.tgname FROM pg_trigger t
        WHERE t.tgrelid = 'checkout_attempts'::regclass
          AND t.tgname = 'TRG_checkout_attempts_immutable' AND NOT t.tgisinternal
      `),
    ).resolves.toEqual([{ tgname: 'TRG_checkout_attempts_immutable' }]);
    await expect(
      dataSource.query(
        "SELECT to_regprocedure('checkout_attempts_prevent_immutable_updates()') AS function",
      ),
    ).resolves.toEqual([
      { function: 'checkout_attempts_prevent_immutable_updates()' },
    ]);
    await expect(
      insert({ institution, buyer, snapshot: { kind: 'COMPLETE' } }),
    ).rejects.toThrow();
  });

  async function uuid(
    table: 'institutions' | 'users' | 'voucher_batches' | 'payment_event',
  ): Promise<string> {
    const statements = {
      institutions: 'INSERT INTO institutions DEFAULT VALUES RETURNING id',
      users: 'INSERT INTO users DEFAULT VALUES RETURNING id',
      voucher_batches:
        'INSERT INTO voucher_batches DEFAULT VALUES RETURNING id',
      payment_event: 'INSERT INTO payment_event DEFAULT VALUES RETURNING id',
    };
    return rowId(await dataSource.query(statements[table]));
  }

  async function insert({
    institution,
    buyer,
    batch = null,
    digest: clientDigest = digest,
    requestFingerprint = fingerprint,
    gateway = 'STRIPE',
    snapshot = completeSnapshot,
  }: {
    institution: string;
    buyer: string;
    batch?: string | null;
    digest?: string | null;
    requestFingerprint?: string;
    gateway?: 'MERCADO_PAGO' | 'STRIPE' | 'OTHER';
    snapshot?: object;
  }): Promise<{ id: string }> {
    const result: unknown = await dataSource.query(
      `INSERT INTO checkout_attempts (owner_institution_id, buyer_user_id, gateway, state, client_key_digest, request_fingerprint, commercial_snapshot, voucher_batch_id)
       VALUES ($1, $2, $3, 'CREATED', $4, $5, $6, $7) RETURNING id`,
      [
        institution,
        buyer,
        gateway,
        clientDigest,
        requestFingerprint,
        snapshot,
        batch,
      ],
    );
    return { id: rowId(result) };
  }

  function rowId(result: unknown): string {
    if (!Array.isArray(result)) {
      throw new Error('Expected INSERT to return a checkout attempt id');
    }
    const [row] = result as unknown[];
    if (
      typeof row !== 'object' ||
      row === null ||
      !('id' in row) ||
      typeof row.id !== 'string'
    ) {
      throw new Error('Expected INSERT to return a checkout attempt id');
    }
    return row.id;
  }
});
