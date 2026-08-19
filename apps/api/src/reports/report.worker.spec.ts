import { ReportWorker } from './report.worker';
import { ReportStatus } from './entities/report.entity';

describe('ReportWorker', () => {
  const setup = (status = ReportStatus.PENDING) => {
    const report = {
      id: 'report-1',
      sessionId: 'session-1',
      version: 1,
      status,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      inputSnapshot: {
        generatedAt: '2026-01-02T00:00:00.000Z',
        assessmentAt: '2026-01-01T00:00:00.000Z',
        data: { patientName: 'Ada', summary: { primaryTitle: 'Art' } },
      },
      markGenerating: jest.fn(function (this: any) {
        this.status = ReportStatus.GENERATING;
      }),
      markAvailable: jest.fn(function (this: any) {
        this.status = ReportStatus.AVAILABLE;
      }),
      markStoragePending: jest.fn(function (this: any) {
        this.status = ReportStatus.STORAGE_PENDING;
      }),
      markFailed: jest.fn(function (this: any) {
        this.status = ReportStatus.FAILED;
      }),
    } as any;
    const reports = {
      findOne: jest.fn().mockResolvedValue(report),
      save: jest.fn(),
    };
    const renderer = {
      render: jest
        .fn()
        .mockResolvedValue({ pdf: Buffer.from('pdf'), inputHash: 'hash-1' }),
    };
    const storage = {
      get: jest.fn(),
      head: jest.fn().mockResolvedValue(null),
      put: jest
        .fn()
        .mockResolvedValue({ objectKey: 'reports/session-1/v1.pdf' }),
    };
    const delivery = { deliver: jest.fn().mockResolvedValue(undefined) };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    return {
      worker: new ReportWorker(
        reports as any,
        renderer as any,
        storage as any,
        delivery as any,
        queue as any,
      ),
      report,
      reports,
      renderer,
      storage,
      delivery,
      queue,
    };
  };
  const job = (attemptsMade = 0) =>
    ({
      data: { reportId: 'report-1' },
      attemptsMade,
      opts: { attempts: 3 },
    }) as any;

  it('renders and stores an absent immutable object using the persisted snapshot', async () => {
    const { worker, report, reports, renderer, storage, queue } = setup();
    await expect(
      worker.process({
        ...job(),
        data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
      }),
    ).resolves.toEqual({
      inputHash: 'hash-1',
      byteLength: 3,
      storageAvailable: true,
    });
    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es-AR',
        timeZone: 'America/Argentina/Buenos_Aires',
        reportVersion: 1,
        generatedAt: '2026-01-02T00:00:00.000Z',
        assessmentAt: '2026-01-01T00:00:00.000Z',
        data: report.inputSnapshot.data,
      }),
    );
    expect(storage.put).toHaveBeenCalledWith(
      'reports/session-1/v1.pdf',
      Buffer.from('pdf'),
      { contentHash: 'hash-1', version: 1 },
    );
    expect(report.markAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ contentHash: 'hash-1' }),
    );
    expect(reports.save).toHaveBeenCalledWith(report);
    expect(queue.add).toHaveBeenCalledWith(
      'deliver',
      { reportId: 'report-1', targetEmail: 'ada@example.com' },
      { jobId: 'report-report-1-deliver' },
    );
  });

  it.each([
    ['matching object', { contentHash: 'hash-1', version: '1' }, 0],
    ['available report', null, 0],
  ])(
    'reconciles %s without duplicate uploads',
    async (_case, head, expectedPuts) => {
      const { worker, storage } = setup(
        _case === 'available report'
          ? ReportStatus.AVAILABLE
          : ReportStatus.PENDING,
      );
      storage.head.mockResolvedValue(head);
      await worker.process(job());
      expect(storage.put).toHaveBeenCalledTimes(expectedPuts);
      if (_case === 'available report')
        expect(storage.head).toHaveBeenCalledTimes(0);
    },
  );

  it('fails a legacy report without an immutable snapshot once and skips retries', async () => {
    const { worker, report, reports, renderer, storage } = setup();
    report.inputSnapshot = null;

    await expect(worker.process(job())).resolves.toEqual({
      skipped: true,
      reason: 'Legacy report has no immutable input snapshot.',
    });

    expect(report.status).toBe(ReportStatus.FAILED);
    expect(report.markFailed).toHaveBeenCalledTimes(1);
    expect(reports.save).toHaveBeenCalledWith(report);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('does not re-mark an already failed legacy report without a snapshot', async () => {
    const { worker, report, reports, renderer } = setup(ReportStatus.FAILED);
    report.inputSnapshot = null;

    await expect(worker.process(job())).resolves.toEqual({
      skipped: true,
      reason: 'Legacy report has no immutable input snapshot.',
    });

    expect(report.markFailed).not.toHaveBeenCalled();
    expect(reports.save).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('uses the idempotent delivery service for in-memory fallback delivery', async () => {
    const { worker, report, reports, storage, delivery } = setup();
    storage.put.mockRejectedValue(new Error('storage unavailable'));

    await expect(
      worker.process({
        ...job(),
        data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
      }),
    ).rejects.toThrow('storage unavailable');

    expect(report.markStoragePending).toHaveBeenCalled();
    expect(report.status).toBe(ReportStatus.STORAGE_PENDING);
    expect(delivery.deliver).toHaveBeenCalledWith(
      report,
      'ada@example.com',
      Buffer.from('pdf'),
    );
    expect(reports.save).toHaveBeenCalledWith(report);
  });

  it('uses the same idempotent delivery service after storage recovery', async () => {
    const { worker, report, storage, delivery } = setup(ReportStatus.AVAILABLE);
    storage.get.mockResolvedValue(Buffer.from('pdf'));

    await worker.process({
      ...job(),
      name: 'deliver',
      data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
    });

    expect(delivery.deliver).toHaveBeenCalledWith(
      report,
      'ada@example.com',
      Buffer.from('pdf'),
    );
  });

  it('fails delivery without calling the service when the stored PDF is missing', async () => {
    const { worker, report, delivery, storage } = setup(ReportStatus.AVAILABLE);
    storage.get.mockResolvedValue(null);

    await expect(
      worker.process({
        ...job(),
        name: 'deliver',
        data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
      }),
    ).rejects.toThrow('Stored report PDF not found.');

    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(report.status).toBe(ReportStatus.AVAILABLE);
    expect(report.markFailed).not.toHaveBeenCalled();
  });

  it('retries email delivery without corrupting an available report', async () => {
    const { worker, report, delivery, storage } = setup(ReportStatus.AVAILABLE);
    storage.get.mockResolvedValue(Buffer.from('pdf'));
    delivery.deliver.mockRejectedValue(new Error('email unavailable'));

    await expect(
      worker.process({
        ...job(1),
        name: 'deliver',
        data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
      }),
    ).rejects.toThrow('email unavailable');

    expect(report.status).toBe(ReportStatus.AVAILABLE);
    expect(report.markFailed).not.toHaveBeenCalled();
  });

  it('logs and rethrows terminal email delivery failures without corrupting the report', async () => {
    const { worker, report, delivery, storage } = setup(ReportStatus.AVAILABLE);
    storage.get.mockResolvedValue(Buffer.from('pdf'));
    delivery.deliver.mockRejectedValue(new Error('email unavailable'));
    const errorLog = jest.spyOn((worker as any).logger, 'error');

    await expect(
      worker.process({
        ...job(2),
        name: 'deliver',
        data: { reportId: 'report-1', targetEmail: 'ada@example.com' },
      }),
    ).rejects.toThrow('email unavailable');

    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('delivery failed permanently'),
    );
    expect(report.status).toBe(ReportStatus.AVAILABLE);
    expect(report.markFailed).not.toHaveBeenCalled();
  });

  it('keeps an intermediate failure generating but marks a terminal attempt failed before rethrowing', async () => {
    const { worker, report, reports, renderer } = setup();
    renderer.render.mockRejectedValue(new Error('render failed'));
    await expect(worker.process(job(1))).rejects.toThrow('render failed');
    expect(report.status).toBe(ReportStatus.GENERATING);
    await expect(worker.process(job(2))).rejects.toThrow('render failed');
    expect(report.status).toBe(ReportStatus.FAILED);
    expect(reports.save).toHaveBeenCalledWith(report);
  });
});
