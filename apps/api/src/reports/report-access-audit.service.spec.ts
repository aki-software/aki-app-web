import { ReportAccessAuditService } from './report-access-audit.service';
import { ReportAccessAuditEvent } from './entities/report-access-audit.entity';

describe('ReportAccessAuditService', () => {
  const input = {
    eventType: ReportAccessAuditEvent.GRANT_ISSUED,
    reportId: 'report-1',
    grantId: null,
    actorUserId: 'user-1',
    scope: 'PATIENT',
    operationKey: 'issue-1',
    occurredAt: new Date(),
  };

  it.each([
    [
      'loads an inserted snake_case PostgreSQL row through the repository',
      [{ id: 'audit-1', operation_key: 'issue-1' }],
    ],
    ['returns an exact operation-key replay', []],
  ])('%s', async (_case, inserted) => {
    const audit = { id: 'audit-1', ...input };
    const repository = {
      create: jest.fn((value) => value),
      findOne: jest.fn().mockResolvedValue(audit),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
      query: jest.fn().mockResolvedValue(inserted),
    } as any;

    await expect(
      new ReportAccessAuditService().append(manager, input),
    ).resolves.toEqual(audit);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT ("operation_key") DO NOTHING'),
      expect.any(Array),
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { operationKey: 'issue-1' },
    });
  });

  it('rejects an operation-key replay with different immutable fields', async () => {
    const audit = { id: 'audit-1', ...input, scope: 'ADMIN' };
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest
        .fn()
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(audit) }),
    } as any;
    await expect(
      new ReportAccessAuditService().append(manager, input),
    ).rejects.toMatchObject({ code: 'REPORT_ACCESS_AUDIT_CONFLICT' });
  });
});
