import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { LocalMetricsService } from './local-metrics.service.js';

@Injectable()
export class OperationalMetricsService {
  private nextCollectAt = 0;
  private pending: Promise<void> | null = null;

  constructor(
    private readonly metrics: LocalMetricsService,
    private readonly dataSource: DataSource,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('pdf') private readonly pdfQueue: Queue,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
    @InjectQueue('send-report') private readonly sendReportQueue: Queue,
    @InjectQueue('metrics') private readonly metricsQueue: Queue,
  ) {}

  collect(): Promise<void> {
    if (this.pending) return this.pending;
    if (Date.now() < this.nextCollectAt) return Promise.resolve();
    this.pending = this.sample().finally(() => {
      this.nextCollectAt = Date.now() + 10_000;
      this.pending = null;
    });
    return this.pending;
  }

  private async sample(): Promise<void> {
    this.metrics.setOperational(
      'heartbeat_timestamp_seconds',
      Date.now() / 1000,
    );
    const probeStart = performance.now();
    try {
      const rows: Array<{ connections: string | number }> =
        await this.dataSource.query(
          'SELECT numbackends AS connections FROM pg_stat_database WHERE datname = current_database()',
        );
      this.metrics.setOperational('postgres_up', 1);
      this.metrics.setOperational(
        'postgres_connections',
        Number(rows[0]?.connections ?? 0),
      );
    } catch {
      this.metrics.setOperational('postgres_up', 0);
    } finally {
      this.metrics.observePostgresProbe(
        (performance.now() - probeStart) / 1000,
      );
    }

    if (process.env.ENABLE_BULLMQ !== 'true') {
      this.metrics.setOperational('queue_enabled', 0);
      this.metrics.setOperational('redis_up', 0);
      return;
    }
    this.metrics.setOperational('queue_enabled', 1);

    const queues = [
      ['email', this.emailQueue],
      ['pdf', this.pdfQueue],
      ['reports', this.reportsQueue],
      ['send-report', this.sendReportQueue],
      ['metrics', this.metricsQueue],
    ] as const;
    try {
      const redis = await this.emailQueue.client;
      this.metrics.setOperational(
        'redis_up',
        (await redis.ping()) === 'PONG' ? 1 : 0,
      );
    } catch {
      this.metrics.setOperational('redis_up', 0);
    }
    await Promise.all(
      queues.map(async ([name, queue]) => {
        try {
          const [counts, waiting] = await Promise.all([
            queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
            queue.getWaiting(0, 0),
          ]);
          this.metrics.setOperational('queue_waiting', counts.waiting ?? 0, {
            queue: name,
          });
          this.metrics.setOperational('queue_up', 1, { queue: name });
          this.metrics.setOperational('queue_active', counts.active ?? 0, {
            queue: name,
          });
          this.metrics.setOperational('queue_delayed', counts.delayed ?? 0, {
            queue: name,
          });
          this.metrics.setOperational('queue_failed', counts.failed ?? 0, {
            queue: name,
          });
          this.metrics.setOperational(
            'queue_oldest_waiting_age_seconds',
            waiting[0]
              ? Math.max(0, (Date.now() - waiting[0].timestamp) / 1000)
              : 0,
            { queue: name },
          );
        } catch {
          this.metrics.setOperational('queue_up', 0, { queue: name });
          for (const metric of [
            'queue_waiting',
            'queue_active',
            'queue_delayed',
            'queue_failed',
            'queue_oldest_waiting_age_seconds',
          ] as const) {
            this.metrics.setOperational(metric, 0, { queue: name });
          }
        }
      }),
    );
  }
}
