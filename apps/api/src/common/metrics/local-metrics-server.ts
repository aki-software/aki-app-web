import { createServer, Server } from 'node:http';
import { LocalMetricsService } from './local-metrics.service.js';
import { OperationalMetricsService } from './operational-metrics.service.js';

export async function startLocalMetricsServer(
  metrics: LocalMetricsService,
  operational: OperationalMetricsService,
  port: number,
  bindAddress = '127.0.0.1',
): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/metrics') {
      response.writeHead(404).end();
      return;
    }
    void operational
      .collect()
      .then(() => metrics.scrape())
      .then((body) => {
        response
          .writeHead(200, { 'Content-Type': metrics.contentType() })
          .end(body);
      })
      .catch(() => response.writeHead(503).end());
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, bindAddress, resolve);
  });
  return server;
}
