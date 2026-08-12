import { ReportsService } from './reports.service';
import { Report, ReportStatus } from './entities/report.entity';

describe('ReportsService', () => {
  const report = (status = ReportStatus.PENDING) =>
    ({
      id: 'report-1',
      sessionId: 'session-1',
      version: 1,
      status,
      retry: jest.fn(function (this: any) {
        this.status = ReportStatus.PENDING;
      }),
    }) as unknown as Report;
  const session = (overrides = {}) =>
    ({
      id: 'session-1',
      patientId: 'patient-1',
      voucherId: 'voucher-1',
      reportUrl: null,
      reportUnlockedAt: null,
      reportUnlockPurchaseToken: null,
      ...overrides,
    }) as any;

  const setup = () => {
    const reports = { findOne: jest.fn(), save: jest.fn() };
    const sessions = { findOne: jest.fn() };
    const queue = { add: jest.fn(), getJob: jest.fn() };
    return {
      service: new ReportsService(
        reports as any,
        sessions as any,
        queue as any,
      ),
      reports,
      sessions,
      queue,
    };
  };

  it.each([
    ['voucher', session(), 'VOUCHER'],
    [
      'verified Google Play',
      session({
        voucherId: null,
        reportUnlockedAt: new Date(),
        reportUnlockPurchaseToken: 'token',
      }),
      'GOOGLE_PLAY',
    ],
  ])(
    'creates truthful %s provenance with a deterministic job ID',
    async (_case, source, entitlementSource) => {
      const { service, reports, sessions, queue } = setup();
      sessions.findOne.mockResolvedValue(source);
      reports.findOne.mockResolvedValue(null);
      reports.save.mockImplementation((value) =>
        Promise.resolve({ ...value, id: 'report-1' }),
      );

      await expect(service.requestGeneration('session-1')).resolves.toEqual({
        reportId: 'report-1',
        jobId: 'report-report-1-v1',
      });
      expect(reports.save).toHaveBeenCalledWith(
        expect.objectContaining({ entitlementSource }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'generate',
        { reportId: 'report-1' },
        { jobId: 'report-report-1-v1' },
      );
    },
  );

  it.each([
    ['pending', ReportStatus.PENDING, true],
    ['generating', ReportStatus.GENERATING, false],
    ['available', ReportStatus.AVAILABLE, false],
  ])(
    'handles duplicate %s reports without a second artifact',
    async (_case, status, queues) => {
      const { service, reports, sessions, queue } = setup();
      sessions.findOne.mockResolvedValue(session());
      reports.findOne.mockResolvedValue(report(status));
      await service.requestGeneration('session-1');
      expect(queue.add).toHaveBeenCalledTimes(queues ? 1 : 0);
    },
  );

  it('retries a failed retained job and recovers a unique creation race', async () => {
    const { service, reports, sessions, queue } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(report());
    reports.save.mockRejectedValueOnce({ code: '23505' });
    await service.requestGeneration('session-1');
    expect(queue.add).toHaveBeenCalledWith(
      'generate',
      { reportId: 'report-1' },
      { jobId: 'report-report-1-v1' },
    );

    reports.save.mockClear();
    reports.findOne.mockResolvedValue(report(ReportStatus.FAILED));
    queue.getJob.mockResolvedValue({ retry: jest.fn() });
    await service.requestGeneration('session-1');
    expect(queue.getJob).toHaveBeenCalledWith('report-report-1-v1');
    expect(reports.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ReportStatus.PENDING }),
    );
  });

  it('fails closed when provenance cannot be proven and treats legacy URLs only as eligibility', async () => {
    const { service, reports, sessions, queue } = setup();
    sessions.findOne.mockResolvedValue(
      session({ voucherId: null, reportUrl: 'https://legacy/report.pdf' }),
    );
    reports.findOne.mockResolvedValue(null);
    await expect(service.requestGeneration('session-1')).rejects.toThrow(
      'Session has not been paid or unlocked.',
    );
    expect(reports.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
