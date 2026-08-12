import { ReportLifecycleSchema1787000000003 } from './1787000000003-ReportLifecycleSchema';

describe('ReportLifecycleSchema1787000000003', () => {
  it('adds report lifecycle tables and constraints without changing existing session or voucher data', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new ReportLifecycleSchema1787000000003();

    await migration.up({ query } as any);

    expect(query.mock.calls.flat().join('\n')).toContain(
      'CREATE TABLE "reports"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'REFERENCES "sessions" ("id")',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'REFERENCES "vouchers" ("id")',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'CREATE TABLE "report_grants"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      "CREATE TYPE \"reports_status_enum\" AS ENUM ('PENDING', 'GENERATING', 'AVAILABLE', 'EXPIRED', 'FAILED')",
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'CREATE UNIQUE INDEX "IDX_reports_session_id_version"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'CREATE UNIQUE INDEX "IDX_report_grants_token_hash"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'CREATE INDEX "IDX_reports_voucher_id"',
    );
    expect(query.mock.calls.flat().join('\n')).not.toContain('IF NOT EXISTS');
    expect(query.mock.calls.flat().join('\n')).not.toContain(
      'DROP TABLE "sessions"',
    );
    expect(query.mock.calls.flat().join('\n')).not.toContain(
      'DROP TABLE "vouchers"',
    );
  });

  it('reverses only the additive report tables and indexes', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new ReportLifecycleSchema1787000000003().down({ query } as any);

    expect(query.mock.calls.flat().join('\n')).toContain(
      'DROP TABLE "report_grants"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'DROP TABLE "reports"',
    );
    expect(query.mock.calls.flat().join('\n')).not.toContain(
      'DROP TABLE "sessions"',
    );
  });

  it('fails on an existing migration-owned object without applying later statements', async () => {
    const query = jest.fn().mockRejectedValueOnce(new Error('already exists'));

    await expect(
      new ReportLifecycleSchema1787000000003().up({ query } as any),
    ).rejects.toThrow('already exists');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
