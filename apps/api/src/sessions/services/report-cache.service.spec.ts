import { ReportCacheService } from './report-cache.service.js';

describe('ReportCacheService', () => {
  let service: ReportCacheService;

  beforeEach(() => {
    service = new ReportCacheService();
  });

  it('returns cached values on hit', async () => {
    const factory = jest.fn().mockResolvedValue('cached-value');

    const first = await service.getOrCreate('report:key', factory);
    const second = await service.getOrCreate('report:key', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe('cached-value');
    expect(second).toBe('cached-value');
  });

  it('deduplicates concurrent locks', async () => {
    let resolvePromise!: (value: string) => void;
    const factory = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const first = service.withLock('report:key', factory);
    const second = service.withLock('report:key', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    resolvePromise('locked-value');

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toBe('locked-value');
    expect(secondResult).toBe('locked-value');
  });
});
