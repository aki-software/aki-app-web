import { createServer } from 'node:net';
import { once } from 'node:events';
import { INestApplication } from '@nestjs/common';
import { LocalMetricsService } from '../common/metrics/local-metrics.service.js';
import { startApiListeners } from './startup-listeners.js';

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve an available local port');
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

describe('startApiListeners', () => {
  const metrics = new LocalMetricsService();
  const operational = { collect: jest.fn().mockResolvedValue(undefined) };

  it('does not start the API if the opt-in metrics port is unavailable', async () => {
    const blocker = createServer();
    blocker.listen(0, '127.0.0.1');
    await once(blocker, 'listening');
    const address = blocker.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not resolve the occupied local port');
    }
    const app = {
      listen: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;

    try {
      await expect(
        startApiListeners(app, {
          port: 0,
          localMetricsEnabled: true,
          metricsPort: address.port,
          metrics,
          operational: operational as never,
        }),
      ).rejects.toThrow();
      expect(app.listen).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  it('closes the metrics listener if the API listener cannot start', async () => {
    const metricsPort = await getAvailablePort();
    const app = {
      listen: jest
        .fn()
        .mockRejectedValue(new Error('API listener unavailable')),
    } as unknown as INestApplication;

    await expect(
      startApiListeners(app, {
        port: 0,
        localMetricsEnabled: true,
        metricsPort,
        metrics,
        operational: operational as never,
      }),
    ).rejects.toThrow('API listener unavailable');

    await expect(
      fetch(`http://127.0.0.1:${metricsPort}/metrics`, {
        signal: AbortSignal.timeout(250),
      }),
    ).rejects.toThrow();
  });
});
