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
      markGenerating: jest.fn(function (this: any) {
        this.status = ReportStatus.GENERATING;
      }),
      markAvailable: jest.fn(function (this: any) {
        this.status = ReportStatus.AVAILABLE;
      }),
      markFailed: jest.fn(function (this: any) {
        this.status = ReportStatus.FAILED;
      }),
    } as any;
    const reports = {
      findOne: jest.fn().mockResolvedValue(report),
      save: jest.fn(),
    };
    const sessions = {
      findOne: jest.fn().mockResolvedValue({
        id: 'session-1',
        sessionDate: new Date('2026-01-01T00:00:00.000Z'),
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'session-1',
          sessionDate: new Date('2026-01-01T00:00:00.000Z'),
          results: [],
        }),
      }),
    };
    const builder = {
      buildReportData: jest.fn().mockResolvedValue({ patientName: 'Ada' }),
    };
    const renderer = {
      render: jest
        .fn()
        .mockResolvedValue({ pdf: Buffer.from('pdf'), inputHash: 'hash-1' }),
    };
    const storage = {
      head: jest.fn().mockResolvedValue(null),
      put: jest
        .fn()
        .mockResolvedValue({ objectKey: 'reports/session-1/v1.pdf' }),
    };
    return {
      worker: new ReportWorker(
        reports as any,
        sessions as any,
        builder as any,
        renderer as any,
        storage as any,
      ),
      report,
      reports,
      builder,
      renderer,
      storage,
    };
  };
  const job = (attemptsMade = 0) =>
    ({
      data: { reportId: 'report-1' },
      attemptsMade,
      opts: { attempts: 3 },
    }) as any;

  it('renders and stores an absent immutable object using canonical input metadata', async () => {
    const { worker, report, reports, renderer, storage } = setup();
    await expect(worker.process(job())).resolves.toEqual({
      inputHash: 'hash-1',
      byteLength: 3,
      storageAvailable: true,
    });
    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es-AR',
        timeZone: 'America/Argentina/Buenos_Aires',
        reportVersion: 1,
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
