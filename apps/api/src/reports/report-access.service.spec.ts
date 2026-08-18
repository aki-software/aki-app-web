import { ReportAccessService } from './report-access.service';
import { ReportStatus } from './entities/report.entity';

describe('ReportAccessService', () => {
  const report = {
    id: 'report-1',
    entitledUserId: null,
    entitledPatientId: 'patient-1',
    status: ReportStatus.AVAILABLE,
    version: 1,
    availableUntil: new Date('2027-01-01'),
  } as any;
  const scope = (role: string, userId = 'firebase-patient-1', email = 'ada@example.com') => ({
    role,
    userId,
    email,
  });
  const setup = () => {
    const manager = {
      query: jest.fn((sql: string) =>
        sql.includes('"firebase_uid"')
          ? Promise.resolve([{ id: 'patient-1' }])
          : Promise.resolve([]),
      ),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(report),
        save: jest.fn(),
        update: jest.fn(),
      }),
    } as any;
    const data = { transaction: jest.fn((fn) => fn(manager)) };
    const audit = { append: jest.fn().mockResolvedValue({}) };
    const consent = { permits: jest.fn().mockResolvedValue(false) };
    return {
      service: new ReportAccessService(data as any, audit as any, consent as any),
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

  it('resolves a Firebase patient identity before comparing the patient entitlement', async () => {
    const { service, manager } = setup();

    await expect(service.status('report-1', scope('PATIENT'))).resolves.toEqual(
      expect.objectContaining({ id: 'report-1' }),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('"firebase_uid"'),
      ['firebase-patient-1'],
    );
  });

  it('normalizes an email scope when resolving a patient identity', async () => {
    const { service, manager } = setup();
    manager.query.mockImplementation((sql: string) =>
      sql.includes('"email"')
        ? Promise.resolve([{ id: 'patient-1' }])
        : Promise.resolve([]),
    );

    await expect(
      service.status('report-1', scope('PATIENT', '', ' Ada@Example.COM ')),
    ).resolves.toEqual(expect.objectContaining({ id: 'report-1' }));
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('"email"'),
      ['ada@example.com'],
    );
  });

  it('returns plaintext once, persists only its hash, and audits issuance in one transaction', async () => {
    const { service, manager, audit } = setup();
    manager.query.mockImplementation((sql: string) =>
      sql.includes('"firebase_uid"')
        ? Promise.resolve([{ id: 'patient-1' }])
        : Promise.resolve([{ id: 'grant-1' }]),
    );
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
    manager.query.mockImplementation((sql: string) =>
      sql.includes('"firebase_uid"')
        ? Promise.resolve([{ id: 'patient-1' }])
        : Promise.resolve([{ id: 'grant-2' }]),
    );
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
    let consumeUpdates = 0;
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE "report_grants"')) {
        consumeUpdates += 1;
        return Promise.resolve(consumeUpdates === 1 ? [{ id: 'grant-1' }] : []);
      }
      return Promise.resolve([{ id: 'patient-1' }]);
    });
    await expect(
      service.consume('hash', scope('PATIENT'), 'consume-1'),
    ).resolves.toBeUndefined();
    await expect(
      service.consume('hash', scope('PATIENT'), 'consume-2'),
    ).rejects.toThrow('used or expired');
    expect(manager.query.mock.calls[0][0]).toContain('"used_at" IS NULL');
  });

  it('authorizes an available historical object and records alternate delivery fields', async () => {
    const { service, manager, audit } = setup();
    const available = {
      ...report,
      objectKey: 'reports/session-1/v1.pdf',
      availableUntil: new Date('2027-01-01'),
    };
    manager.getRepository().findOne.mockResolvedValue(available);

    await expect(
      (service as any).authorizeDelivery(
        'report-1',
        scope('PATIENT'),
        'ada@example.com',
        'delivery-1',
      ),
    ).resolves.toEqual(available);
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        eventType: 'REPORT_DELIVERY_AUTHORIZED',
        recipientEmail: 'ada@example.com',
        outcome: 'AUTHORIZED',
        operationKey: 'delivery-1',
      }),
    );
  });

  it('rejects alternate delivery when consent policy denies the actor', async () => {
    const { service } = setup();
    await expect(
      (service as any).authorizeDelivery(
        'report-1',
        scope('THERAPIST'),
        'ada@example.com',
        'delivery-1',
      ),
    ).rejects.toThrow('not permitted');
  });

  it('rejects an unauthorized download before it can reach storage', async () => {
    const { service } = setup();
    await expect(service.download('report-1', scope('THERAPIST'))).rejects.toThrow(
      'not permitted',
    );
  });

  it('rejects expired or incomplete report objects', async () => {
    const { service, manager } = setup();
    const findOne = manager.getRepository().findOne;
    findOne.mockResolvedValueOnce({
      ...report,
      objectKey: 'private/reports/report-1.pdf',
      availableUntil: new Date('2020-01-01'),
    });
    await expect(service.download('report-1', scope('PATIENT'))).rejects.toThrow(
      'unavailable',
    );
    findOne.mockResolvedValueOnce({ ...report, objectKey: null });
    await expect(service.download('report-1', scope('PATIENT'))).rejects.toThrow(
      'not found',
    );
  });

  it('records a successful download with the existing audit seam', async () => {
    const { service, manager, audit } = setup();
    const downloadable = { ...report, objectKey: 'private/reports/report-1.pdf' };
    await service.recordDownload(downloadable, scope('PATIENT'));
    expect(manager.getRepository().update).toHaveBeenCalledWith(
      'report-1',
      expect.objectContaining({ lastAccessedAt: expect.any(Date) }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        eventType: 'REPORT_DOWNLOAD_ACCESSED',
        reportId: 'report-1',
        grantId: null,
      }),
    );
  });
});
