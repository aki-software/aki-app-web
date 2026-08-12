import { ReportAccessAuditSchema1787000000004 } from './1787000000004-ReportAccessAuditSchema';

describe('ReportAccessAuditSchema1787000000004', () => {
  it('adds constrained append-only report access audit persistence', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new ReportAccessAuditSchema1787000000004().up({ query } as any);
    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE "report_access_audits"');
    expect(sql).toContain('REFERENCES "reports" ("id")');
    expect(sql).toContain('REFERENCES "report_grants" ("id")');
    expect(sql).toContain('IDX_report_access_audits_operation_key');
    expect(sql).toContain('REPORT_GRANT_CONSUMED');
    expect(sql).toContain(
      'CREATE TRIGGER "TRG_report_access_audits_append_only"',
    );
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).not.toMatch(
      /metadata|token_hash|presigned|credential|SET NULL/i,
    );
  });

  it('reverses only its additive table and enum', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new ReportAccessAuditSchema1787000000004().down({ query } as any);
    expect(query.mock.calls.flat().join('\n')).toContain(
      'DROP TABLE "report_access_audits"',
    );
    expect(query.mock.calls.flat().join('\n')).toContain(
      'DROP FUNCTION "prevent_report_access_audit_mutation"',
    );
  });
});
