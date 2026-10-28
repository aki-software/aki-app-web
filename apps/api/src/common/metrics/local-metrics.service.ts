import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from '@prometheus-io/client';

export type OperationalMetric =
  | 'postgres_up'
  | 'postgres_connections'
  | 'redis_up'
  | 'queue_enabled'
  | 'queue_up'
  | 'queue_waiting'
  | 'queue_active'
  | 'queue_delayed'
  | 'queue_failed'
  | 'queue_oldest_waiting_age_seconds'
  | 'heartbeat_timestamp_seconds';

@Injectable()
export class LocalMetricsService {
  private readonly registry = new Registry();
  private readonly httpRequests = new Counter({
    name: 'akit_http_requests_total',
    help: 'Completed HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });
  private readonly httpDuration = new Histogram({
    name: 'akit_http_request_duration_seconds',
    help: 'Completed HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [this.registry],
  });
  private readonly postgresProbeDuration = new Histogram({
    name: 'akit_postgres_probe_duration_seconds',
    help: 'Duration of read-only PostgreSQL metrics probe in seconds',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });
  private readonly operational = new Map<OperationalMetric, Gauge<'queue'>>();

  constructor() {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_LOCAL_METRICS === 'true'
    ) {
      collectDefaultMetrics({ register: this.registry, prefix: 'akit_' });
    }
    for (const name of [
      'postgres_up',
      'postgres_connections',
      'redis_up',
      'queue_enabled',
      'queue_up',
      'queue_waiting',
      'queue_active',
      'queue_delayed',
      'queue_failed',
      'queue_oldest_waiting_age_seconds',
      'heartbeat_timestamp_seconds',
    ] as const) {
      this.operational.set(
        name,
        new Gauge({
          name: `akit_${name}`,
          help: `Local operational measure: ${name}`,
          labelNames: ['queue'] as const,
          registers: [this.registry],
        }),
      );
    }
  }

  setOperational(
    name: OperationalMetric,
    value: number,
    labels: { queue?: string } = {},
  ): void {
    const queue = labels.queue;
    if (
      queue !== undefined &&
      !['email', 'pdf', 'reports', 'send-report', 'metrics'].includes(queue)
    )
      return;
    this.operational.get(name)?.set({ queue: queue ?? '' }, value);
  }

  observePostgresProbe(durationSeconds: number): void {
    this.postgresProbeDuration.observe(durationSeconds);
  }

  recordHttpRequest(
    request: Request,
    status: number,
    durationMs: number,
  ): void {
    const method = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
    ].includes(request.method)
      ? request.method
      : 'OTHER';
    const routePath: unknown = request.route?.path;
    const route =
      typeof routePath === 'string' &&
      routePath.startsWith('/') &&
      routePath.length < 160
        ? routePath
        : 'unmatched';
    const labels = { method, route, status: String(status) };
    this.httpRequests.inc(labels);
    this.httpDuration.observe(labels, durationMs / 1000);
  }

  scrape(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
