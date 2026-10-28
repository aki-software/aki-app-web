jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  SchedulerRegistry: jest.fn(),
}));

import { ReportReconcilerService } from './report-reconciler.service';
import { ReportStatus } from './entities/report.entity';
import { Logger } from '@nestjs/common';

describe('ReportReconcilerService', () => {
  const makeReport = (
    overrides: Partial<{
      id: string;
      sessionId: string;
      version: number;
      status: ReportStatus;
      inputSnapshot: unknown;
      objectKey: string | null;
      contentHash: string | null;
      generatedAt: Date | null;
      storagePendingSince: Date | null;
    }> = {},
  ) => ({
    id: 'report-1',
    sessionId: 'session-1',
    version: 1,
    status: ReportStatus.STORAGE_PENDING,
    objectKey: null,
    contentHash: null,
    generatedAt: null,
    storagePendingSince: new Date('2026-10-26T00:00:00.000Z'),
    inputSnapshot: {
      generatedAt: '2026-01-02T00:00:00.000Z',
      assessmentAt: '2026-01-01T00:00:00.000Z',
      data: { patientName: 'Ada', summary: { primaryTitle: 'Art' } },
    },
    markAvailable: jest.fn(function (this: any) {
      this.status = ReportStatus.AVAILABLE;
    }),
    ...overrides,
  });

  const setup = (reports: unknown[] = [makeReport()]) => {
    const repository = {
      find: jest.fn().mockResolvedValue(reports),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const renderer = {
      render: jest
        .fn()
        .mockResolvedValue({ pdf: Buffer.from('pdf'), inputHash: 'hash-1' }),
    };
    const storage = {
      buildReportObjectKey: jest
        .fn()
        .mockReturnValue('reports/session-1/v1.pdf'),
      head: jest.fn().mockResolvedValue(null),
      put: jest
        .fn()
        .mockResolvedValue({ objectKey: 'reports/session-1/v1.pdf' }),
    };

    const service = new ReportReconcilerService(
      repository as any,
      renderer as any,
      storage as any,
    );

    return { service, repository, renderer, storage };
  };

  it('does nothing when there are no STORAGE_PENDING reports', async () => {
    const { service, renderer, storage } = setup([]);
    await service.reconcileStoragePending();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('renders, uploads, and marks report available', async () => {
    const report = makeReport();
    const { service, repository, renderer, storage } = setup([report]);

    await service.reconcileStoragePending();

    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es-AR',
        timeZone: 'America/Argentina/Buenos_Aires',
        reportVersion: 1,
        generatedAt: '2026-01-02T00:00:00.000Z',
        assessmentAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    expect(storage.buildReportObjectKey).toHaveBeenCalledWith('session-1', 1);
    expect(storage.head).toHaveBeenCalledWith('reports/session-1/v1.pdf');
    expect(storage.put).toHaveBeenCalledWith(
      'reports/session-1/v1.pdf',
      Buffer.from('pdf'),
      { contentHash: 'hash-1', version: 1 },
    );
    expect(report.markAvailable).toHaveBeenCalledWith({
      objectKey: 'reports/session-1/v1.pdf',
      contentHash: 'hash-1',
      generatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    expect(repository.save).toHaveBeenCalledWith(report);
  });

  it('skips upload when object already exists in storage', async () => {
    const report = makeReport();
    const { service, storage } = setup([report]);
    storage.head.mockResolvedValue({ contentHash: 'hash-1', version: '1' });

    await service.reconcileStoragePending();

    expect(storage.put).not.toHaveBeenCalled();
    expect(report.markAvailable).toHaveBeenCalled();
  });

  it.each([
    ['hash', { contentHash: 'different-hash', version: '1' }],
    ['version', { contentHash: 'hash-1', version: '2' }],
  ])(
    'does not mark a report available when an immutable object %s mismatches',
    async (_mismatch, metadata) => {
      const report = makeReport();
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const { service, repository, storage } = setup([report]);
      storage.head.mockResolvedValue(metadata);

      await service.reconcileStoragePending();

      expect(storage.put).not.toHaveBeenCalled();
      expect(report.markAvailable).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      const capturedLogs = JSON.stringify([
        ...errorSpy.mock.calls,
        ...logSpy.mock.calls,
      ]);
      expect(capturedLogs).not.toContain('report-1');
      expect(capturedLogs).not.toContain('session-1');
      expect(capturedLogs).not.toContain(metadata.contentHash);
      expect(capturedLogs).toContain('immutable_object_mismatch');
      errorSpy.mockRestore();
      logSpy.mockRestore();
    },
  );

  it('logs aggregate storage-pending age buckets without loading identifiers into the event', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const now = Date.now();
    const recent = makeReport({
      id: 'recent-report-id',
      sessionId: 'recent-session-id',
      storagePendingSince: new Date(now - 30 * 60 * 1000),
    });
    const sameDay = makeReport({
      id: 'same-day-report-id',
      sessionId: 'same-day-session-id',
      storagePendingSince: new Date(now - 12 * 60 * 60 * 1000),
    });
    const old = makeReport({
      id: 'old-report-id',
      sessionId: 'old-session-id',
      storagePendingSince: new Date(now - 36 * 60 * 60 * 1000),
    });
    const unknown = makeReport({
      id: 'unknown-report-id',
      sessionId: 'unknown-session-id',
      storagePendingSince: null,
    });
    const { service } = setup([recent, sameDay, old, unknown]);

    await service.reconcileStoragePending();

    const startEvent = logSpy.mock.calls
      .map(([message]) => JSON.parse(String(message)))
      .find(({ event }) => event === 'reconciler.start');
    expect(startEvent).toMatchObject({
      storagePendingAgeBuckets: {
        underOneHour: 1,
        oneToTwentyFourHours: 1,
        overTwentyFourHours: 1,
        unknown: 1,
      },
    });
    const capturedLogs = JSON.stringify(logSpy.mock.calls);
    expect(capturedLogs).not.toContain('recent-report-id');
    expect(capturedLogs).not.toContain('same-day-session-id');
    expect(capturedLogs).not.toContain('old-report-id');
    expect(capturedLogs).not.toContain('unknown-report-id');
    logSpy.mockRestore();
  });

  it('skips reports with no inputSnapshot', async () => {
    const report = makeReport({ inputSnapshot: null });
    const { service, renderer, storage } = setup([report]);

    await service.reconcileStoragePending();

    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
    expect(report.markAvailable).not.toHaveBeenCalled();
  });

  it('continues processing remaining reports when one fails', async () => {
    const failing = makeReport();
    const passing = makeReport();
    failing.id = 'report-fail';
    passing.id = 'report-ok';

    const { service, renderer, storage } = setup([failing, passing]);

    // First render call throws, second succeeds
    renderer.render
      .mockRejectedValueOnce(new Error('render error'))
      .mockResolvedValueOnce({ pdf: Buffer.from('pdf'), inputHash: 'hash-1' });

    await service.reconcileStoragePending();

    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(passing.markAvailable).toHaveBeenCalled();
  });

  it('does not re-deliver by email', async () => {
    // ReportReconcilerService has no delivery dependency at all
    const deps = Object.getOwnPropertyNames(
      (ReportReconcilerService as any).prototype,
    );
    // Ensure no delivery method exists on the service
    expect(deps).not.toContain('deliver');

    const { service } = setup();
    // reconcileStoragePending should complete without any delivery side-effect
    await expect(service.reconcileStoragePending()).resolves.not.toThrow();
  });
});
