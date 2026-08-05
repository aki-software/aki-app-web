import { ConfigService } from '@nestjs/config';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';
import { JobNames } from '../jobs/job-names.js';

describe('InMemoryQueueAdapter', () => {
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should always report as not configured', () => {
    const adapter = new InMemoryQueueAdapter(configService);
    expect(adapter.isConfigured()).toBe(false);
  });

  it('dispatches inline without throwing when not configured', async () => {
    (configService.get as jest.Mock).mockReturnValue(undefined);
    const adapter = new InMemoryQueueAdapter(configService);

    await expect(
      adapter.enqueue(JobNames.SendReport, { sessionId: 's1' }),
    ).resolves.not.toThrow();
  });

  it('dispatches inline without throwing even when redis is present (fallback adapter)', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'REDIS_URL') return 'redis://localhost';
      return undefined;
    });
    const adapter = new InMemoryQueueAdapter(configService);

    await expect(
      adapter.enqueue(JobNames.SendReport, { sessionId: 's2' }),
    ).resolves.not.toThrow();
  });
});
