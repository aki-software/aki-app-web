import { AddressInfo } from 'node:net';
import { startLocalMetricsServer } from './local-metrics-server.js';
import { LocalMetricsService } from './local-metrics.service.js';

describe('local metrics listener', () => {
  it('binds loopback and serves only the scrape route', async () => {
    const metrics = new LocalMetricsService();
    const operational = { collect: jest.fn().mockResolvedValue(undefined) };
    const server = await startLocalMetricsServer(
      metrics,
      operational as never,
      0,
    );
    try {
      const address = server.address() as AddressInfo;
      expect(address.address).toBe('127.0.0.1');
      const base = `http://127.0.0.1:${address.port}`;
      const response = await fetch(`${base}/metrics`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
      expect(await response.text()).toContain('akit_http_requests_total');
      expect((await fetch(`${base}/private`)).status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('supports an explicitly configured loopback address', async () => {
    const metrics = new LocalMetricsService();
    const operational = { collect: jest.fn().mockResolvedValue(undefined) };
    const server = await startLocalMetricsServer(
      metrics,
      operational as never,
      0,
      '127.0.0.2',
    );

    try {
      const address = server.address() as AddressInfo;
      expect(address.address).toBe('127.0.0.2');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
