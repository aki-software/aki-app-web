import { ReportsService } from './reports.service';
import { Report, ReportStatus } from './entities/report.entity';

describe('ReportsService', () => {
  const report = (status = ReportStatus.PENDING) =>
    ({
      id: 'report-1',
      sessionId: 'session-1',
      version: 1,
      status,
      inputSnapshot: {
        generatedAt: '2026-01-02T00:00:00.000Z',
        assessmentAt: '2026-01-01T00:00:00.000Z',
        data: { patientName: 'Ada', summary: { primaryTitle: 'Art' } },
      },
      retry: jest.fn(function (this: any) {
        this.status = ReportStatus.PENDING;
      }),
    }) as unknown as Report;
  const session = (overrides = {}) =>
    ({
      id: 'session-1',
      patientId: 'patient-1',
      patientName: 'Ada Lovelace',
      voucherId: 'voucher-1',
      reportUrl: null,
      reportUnlockedAt: null,
      reportUnlockPurchaseToken: null,
      sessionDate: new Date('2026-01-01T00:00:00.000Z'),
      results: [],
      ...overrides,
    }) as any;

  const setup = () => {
    const reports = { findOne: jest.fn(), save: jest.fn() };
    const findSession = jest.fn();
    const sessions = {
      findOne: findSession,
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: findSession,
      }),
    };
    const queue = { add: jest.fn(), getJob: jest.fn() };
    const delivery = {
      request: jest.fn().mockResolvedValue({ queued: true, idempotent: false }),
    };
    const reportData = {
      buildReportData: jest.fn().mockImplementation((source) =>
        Promise.resolve({
          patientName: source.patientName,
          summary: { primaryTitle: 'Art' },
        }),
      ),
    };
    return {
      service: new ReportsService(
        reports as any,
        sessions as any,
        queue as any,
        reportData as any,
        delivery as any,
      ),
      reports,
      sessions,
      queue,
      reportData,
      delivery,
    };
  };

  it('enqueues a delivery job once for an authorized historical report recipient', async () => {
    const { service, queue, delivery } = setup();
    await expect(
      service.enqueueDelivery('report-1', 'ada@example.com'),
    ).resolves.toEqual({
      queued: true,
      idempotent: false,
    });
    expect(delivery.request).toHaveBeenCalledWith(
      'report-1',
      'ada@example.com',
    );
    expect(queue.add).toHaveBeenCalledWith(
      'deliver',
      { reportId: 'report-1', targetEmail: 'ada@example.com' },
      expect.objectContaining({
        jobId: expect.stringContaining('report-1-deliver-'),
      }),
    );
  });

  it('recovers queue insertion after a prior enqueue failure without creating another delivery', async () => {
    const { service, queue, delivery } = setup();
    queue.add.mockRejectedValueOnce(new Error('Redis unavailable'));
    delivery.request
      .mockResolvedValueOnce({ queued: true, idempotent: false })
      .mockResolvedValueOnce({ queued: true, idempotent: true });

    await expect(
      service.enqueueDelivery('report-1', 'ada@example.com'),
    ).rejects.toThrow('Redis unavailable');
    await expect(
      service.enqueueDelivery('report-1', 'ada@example.com'),
    ).resolves.toEqual({
      queued: true,
      idempotent: true,
    });

    expect(delivery.request).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledTimes(2);
  });

  it('does not enqueue an existing delivered recipient', async () => {
    const { service, queue, delivery } = setup();
    delivery.request.mockResolvedValue({ queued: false, idempotent: true });

    await expect(
      service.enqueueDelivery('report-1', 'ada@example.com'),
    ).resolves.toEqual({
      queued: false,
      idempotent: true,
    });

    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not duplicate an existing pending delivery job', async () => {
    const { service, queue, delivery } = setup();
    const job = {
      getState: jest.fn().mockResolvedValue('waiting'),
      retry: jest.fn(),
    };
    delivery.request.mockResolvedValue({ queued: true, idempotent: true });
    queue.getJob.mockResolvedValue(job);

    await service.enqueueDelivery('report-1', 'ada@example.com');

    expect(queue.add).not.toHaveBeenCalled();
    expect(job.retry).not.toHaveBeenCalled();
  });

  it('retries an existing failed delivery job', async () => {
    const { service, queue, delivery } = setup();
    const job = {
      getState: jest.fn().mockResolvedValue('failed'),
      retry: jest.fn(),
    };
    delivery.request.mockResolvedValue({ queued: true, idempotent: true });
    queue.getJob.mockResolvedValue(job);

    await service.enqueueDelivery('report-1', 'ada@example.com');

    expect(queue.add).not.toHaveBeenCalled();
    expect(job.retry).toHaveBeenCalledTimes(1);
  });

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
        { reportId: 'report-1', targetEmail: undefined },
        { jobId: 'report-report-1-v1' },
      );
    },
  );

  it('entitles a patient report to the patient record instead of the users table', async () => {
    const { service, reports, sessions } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(null);
    reports.save.mockImplementation((value) =>
      Promise.resolve({ ...value, id: 'report-1' }),
    );

    await service.requestGeneration('session-1');

    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        entitledUserId: null,
        entitledPatientId: 'patient-1',
      }),
    );
  });

  it('uses a therapist user entitlement when the session has no patient', async () => {
    const { service, reports, sessions } = setup();
    sessions.findOne.mockResolvedValue(
      session({ patientId: null, therapistUserId: 'therapist-1' }),
    );
    reports.findOne.mockResolvedValue(null);
    reports.save.mockImplementation((value) =>
      Promise.resolve({ ...value, id: 'report-1' }),
    );

    await service.requestGeneration('session-1');

    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        entitledUserId: 'therapist-1',
        entitledPatientId: null,
      }),
    );
  });

  it('persists rendering input before the report job can observe mutable session data', async () => {
    const { service, reports, sessions, reportData } = setup();
    const source = session();
    sessions.findOne.mockResolvedValue(source);
    reports.findOne.mockResolvedValue(null);
    reports.save.mockImplementation((value) =>
      Promise.resolve({ ...value, id: 'report-1' }),
    );

    await service.requestGeneration('session-1');
    source.patientName = 'Changed later';

    expect(reportData.buildReportData).toHaveBeenCalledWith(source);
    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        inputSnapshot: expect.objectContaining({
          assessmentAt: '2026-01-01T00:00:00.000Z',
          data: expect.objectContaining({ patientName: 'Ada Lovelace' }),
        }),
      }),
    );
  });

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

  it('enqueues evaluator delivery jobs for therapist dashboard requests', async () => {
    const { service, reports, sessions, queue, delivery } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(report(ReportStatus.AVAILABLE));
    const scope = {
      role: 'THERAPIST',
      therapistUserId: 'therapist-1',
    } as never;

    await service.requestGeneration(
      'session-1',
      'therapist@example.com',
      scope,
    );

    expect(delivery.request).toHaveBeenCalledWith(
      'report-1',
      'therapist@example.com',
    );
    expect(queue.add).toHaveBeenCalledWith(
      'deliver',
      {
        reportId: 'report-1',
        targetEmail: 'therapist@example.com',
        audience: 'EVALUATOR',
      },
      expect.any(Object),
    );
  });

  it('enqueues a forced resend with recipient-specific job data for an available report', async () => {
    const { service, reports, sessions, queue, delivery } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(report(ReportStatus.AVAILABLE));

    await service.requestGeneration(
      'session-1',
      'Ada@Example.com',
      undefined,
      true,
    );

    expect(delivery.request).toHaveBeenCalledWith(
      'report-1',
      'ada@example.com',
      true,
    );
    expect(queue.add).toHaveBeenCalledWith(
      'deliver',
      {
        reportId: 'report-1',
        targetEmail: 'ada@example.com',
        force: true,
      },
      expect.objectContaining({
        jobId: expect.stringMatching(
          /^report-report-1-deliver-[a-f0-9]{16}-force-/,
        ),
      }),
    );
  });

  it('rejects a legacy non-available report without an immutable snapshot', async () => {
    const { service, reports, sessions, queue } = setup();
    const legacy = report(ReportStatus.FAILED);
    legacy.inputSnapshot = null;
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(legacy);

    await expect(service.requestGeneration('session-1')).rejects.toThrow(
      'Legacy report cannot be generated because its immutable input snapshot is unavailable.',
    );

    expect(legacy.retry).not.toHaveBeenCalled();
    expect(reports.save).not.toHaveBeenCalled();
    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not regenerate an available legacy report without an immutable snapshot', async () => {
    const { service, reports, sessions, queue, reportData } = setup();
    const legacy = report(ReportStatus.AVAILABLE);
    legacy.inputSnapshot = null;
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(legacy);

    await expect(service.requestGeneration('session-1')).resolves.toEqual({
      reportId: 'report-1',
      jobId: 'report-report-1-v1',
    });

    expect(reportData.buildReportData).not.toHaveBeenCalled();
    expect(reports.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('retries storage persistence without creating a new report version', async () => {
    const { service, reports, sessions, queue } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValue(report(ReportStatus.STORAGE_PENDING));
    queue.getJob.mockResolvedValue(null);

    await service.requestGeneration('session-1');

    expect(queue.add).toHaveBeenCalledWith(
      'generate',
      { reportId: 'report-1', targetEmail: undefined },
      { jobId: 'report-report-1-v1' },
    );
    expect(reports.save).not.toHaveBeenCalled();
  });

  it('retries a failed retained job and recovers a unique creation race', async () => {
    const { service, reports, sessions, queue } = setup();
    sessions.findOne.mockResolvedValue(session());
    reports.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(report());
    reports.save.mockRejectedValueOnce({ code: '23505' });
    await service.requestGeneration('session-1');
    expect(queue.add).toHaveBeenCalledWith(
      'generate',
      { reportId: 'report-1', targetEmail: undefined },
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
