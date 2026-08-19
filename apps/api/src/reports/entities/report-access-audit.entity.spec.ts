import {
  ReportAccessAudit,
  ReportAccessAuditEvent,
} from './report-access-audit.entity';

describe('ReportAccessAudit', () => {
  it.each([
    ReportAccessAuditEvent.GRANT_ISSUED,
    ReportAccessAuditEvent.GRANT_RENEWED,
    ReportAccessAuditEvent.GRANT_CONSUMED,
    ReportAccessAuditEvent.DOWNLOAD_ACCESSED,
  ])('records the token-free %s event shape', (eventType) => {
    const audit = ReportAccessAudit.create({
      eventType,
      reportId: 'report-1',
      grantId: null,
      actorUserId: 'user-1',
      scope: 'PATIENT',
      operationKey: `operation-${eventType}`,
      occurredAt: new Date('2026-08-11T00:00:00.000Z'),
    });

    expect(audit).toMatchObject({
      eventType,
      reportId: 'report-1',
    });
    expect(JSON.stringify(audit)).not.toMatch(/token|url|credential/i);
  });

  it('has no metadata or reason field that could retain sensitive values', () => {
    const audit = ReportAccessAudit.create({
      eventType: ReportAccessAuditEvent.GRANT_ISSUED,
      reportId: 'report-1',
      grantId: null,
      actorUserId: null,
      scope: 'PATIENT',
      operationKey: 'issue-safe',
      occurredAt: new Date(),
    });
    expect(audit).not.toHaveProperty('metadata');
    expect(audit).not.toHaveProperty('reasonCode');
  });
});
