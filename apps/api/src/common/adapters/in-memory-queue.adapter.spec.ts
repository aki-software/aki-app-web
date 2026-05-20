import { ConfigService } from '@nestjs/config';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';
import { JobDispatcherService } from '../services/job-dispatcher.service.js';
import { JobNames } from '../jobs/job-names.js';

describe('InMemoryQueueAdapter', () => {
  const dispatcher = {
    dispatchWithRetry: jest.fn(),
  } as unknown as JobDispatcherService;

  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches inline with defaults when not configured', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce(undefined);
    (configService.get as jest.Mock).mockReturnValueOnce(undefined);
    const adapter = new InMemoryQueueAdapter(dispatcher, configService);

    await adapter.enqueue(JobNames.SendReport, { sessionId: 's1' });

    expect(dispatcher.dispatchWithRetry).toHaveBeenCalledWith(
      JobNames.SendReport,
      { sessionId: 's1' },
      expect.objectContaining({
        attempts: 3,
        backoffMs: 60_000,
        backoffType: 'exponential',
      }),
    );
  });

  it('runs inline even when configured (fallback adapter)', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce('redis://localhost');
    (configService.get as jest.Mock).mockReturnValueOnce(undefined);
    const adapter = new InMemoryQueueAdapter(dispatcher, configService);

    await adapter.enqueue(JobNames.SendReport, { sessionId: 's2' });

    expect(dispatcher.dispatchWithRetry).toHaveBeenCalledTimes(1);
  });
});
