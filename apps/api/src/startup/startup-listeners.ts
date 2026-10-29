import { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { LocalMetricsService } from '../common/metrics/local-metrics.service.js';
import { OperationalMetricsService } from '../common/metrics/operational-metrics.service.js';
import { startLocalMetricsServer } from '../common/metrics/local-metrics-server.js';

interface ApiListenerOptions {
  port: string | number;
  localMetricsEnabled: boolean;
  metricsPort: number;
  metricsBindAddress?: string;
  metrics: LocalMetricsService;
  operational: OperationalMetricsService;
}

export async function startApiListeners(
  app: INestApplication,
  options: ApiListenerOptions,
): Promise<Server | undefined> {
  const metricsServer = options.localMetricsEnabled
    ? await startLocalMetricsServer(
        options.metrics,
        options.operational,
        options.metricsPort,
        options.metricsBindAddress,
      )
    : undefined;

  try {
    await app.listen(options.port, '0.0.0.0');
  } catch (error) {
    if (metricsServer) {
      await new Promise<void>((resolve) =>
        metricsServer.close(() => resolve()),
      );
    }
    throw error;
  }

  return metricsServer;
}
