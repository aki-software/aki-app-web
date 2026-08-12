import { ReportAccessService } from './report-access.service';
import { ReportStatus } from './entities/report.entity';

describe('ReportAccessService', () => {
  const report = {
    id: 'report-1',
    entitledUserId: 'patient-1',
    status: ReportStatus.AVAILABLE,
    version: 1,
    availableUntil: new Date('2027-01-01'),
  } as any;
  const scope = (role: string, userId = 'patient-1') => ({ role, userId });
  const setup = () => {
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(report),
        save: jest.fn(),
      }),
    } as any;
    const data = { transaction: jest.fn((fn) => fn(manager)) };
    const audit = { append: jest.fn().mockResolvedValue({}) };
    const consent = { permits: jest.fn().mockResolvedValue(false) };
    return {
      service: new ReportAccessService(
        data as any,
        audit as any,
        consent as any,
      ),
      manager,
      audit,
      consent,
    };
  };

  it.each([
    ['PATIENT', true],
    ['ADMIN', true],
    ['THERAPIST', false],
    ['INSTITUTION', false],
  ])('authorizes %s only when policy permits it', async (role, allowed) => {
    const { service, consent } = setup();
    if (role === 'THERAPIST' || role === 'INSTITUTION')
      consent.permits.mockResolvedValue(allowed);
    const access = service.status('report-1', scope(role));
    if (allowed)
      await expect(access).resolves.toEqual(
        expect.objectContaining({ id: 'report-1' }),
      );
    else await expect(access).rejects.toThrow('not permitted');
  });

  it('returns plaintext once, persists only its hash, and audits issuance in one transaction', async () => {
    const { service, manager, audit } = setup();
    manager.query.mockResolvedValue([{ id: 'grant-1' }]);
    const result = await service.issue('report-1', scope('PATIENT'), 'issue-1');
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(manager.query.mock.calls[0][1]).not.toContain(result.token);
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ operationKey: 'issue-1' }),
    );
  });

  it('renews only within availability and records a renewal audit', async () => {
    const { service, manager, audit } = setup();
    manager.query.mockResolvedValue([{ id: 'grant-2' }]);
    await expect(
      service.renew('report-1', scope('PATIENT'), 'renew-1'),
    ).resolves.toEqual(expect.objectContaining({ token: expect.any(String) }));
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ eventType: 'REPORT_GRANT_RENEWED' }),
    );
  });

  it('uses a conditional update so a second consume cannot succeed', async () => {
    const { service, manager } = setup();
    manager.query
      .mockResolvedValueOnce([{ id: 'grant-1' }])
      .mockResolvedValueOnce([]);
    await expect(
      service.consume('hash', scope('PATIENT'), 'consume-1'),
    ).resolves.toBeUndefined();
    await expect(
      service.consume('hash', scope('PATIENT'), 'consume-2'),
    ).rejects.toThrow('used or expired');
    expect(manager.query.mock.calls[0][0]).toContain('"used_at" IS NULL');
  });
});
