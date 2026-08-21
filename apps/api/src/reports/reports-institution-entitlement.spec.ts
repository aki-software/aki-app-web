import { ReportsService } from './reports.service';
import { Report, ReportEntitlementSource } from './entities/report.entity';

describe('ReportsService institution entitlement', () => {
  const session = {
    id: 'session-1',
    patientId: 'patient-1',
    institutionId: 'institution-1',
    voucherId: null,
    reportUnlockedAt: null,
    reportUnlockPurchaseToken: null,
    patientName: 'Ada Lovelace',
    sessionDate: new Date('2026-01-01T00:00:00.000Z'),
    results: [],
  };

  const setup = () => {
    const reports = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((report) => ({ ...report, id: 'report-1' })),
    };
    const sessions = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(session),
      }),
    };
    const queue = { add: jest.fn(), getJob: jest.fn() };
    const reportData = {
      buildReportData: jest.fn().mockResolvedValue({
        patientName: session.patientName,
        summary: { primaryTitle: 'Art' },
      }),
    };
    const delivery = { request: jest.fn() };

    return {
      service: new ReportsService(
        reports as never,
        sessions as never,
        queue as never,
        reportData as never,
        delivery as never,
      ),
      reports,
      queue,
    };
  };

  it('creates an institution-entitled report only for a matching institution admin', async () => {
    const { service, reports } = setup();

    await expect(
      service.requestGeneration('session-1', undefined, {
        role: 'INSTITUTION_ADMIN',
        institutionId: 'institution-1',
      }),
    ).resolves.toEqual({ reportId: 'report-1', jobId: 'report-report-1-v1' });

    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlementSource: ReportEntitlementSource.INSTITUTION,
        voucherId: null,
      }),
    );
  });

  it('rejects an unpaid session when the institution admin scope does not match', async () => {
    const { service, reports, queue } = setup();

    await expect(
      service.requestGeneration('session-1', undefined, {
        role: 'INSTITUTION_ADMIN',
        institutionId: 'institution-2',
      }),
    ).rejects.toThrow('Session has not been paid or unlocked.');

    expect(reports.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
