import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueAdapter, QueueJobOptions } from './queue.adapter';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter';

type RedisConnectionConfig =
  | { url: string }
  | { host: string; port: number }
  | null;

@Injectable()
export class BullMQQueueAdapter implements QueueAdapter {
  private readonly logger = new Logger(BullMQQueueAdapter.name);
  private readonly queue: Queue | null;
  readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackAdapter: InMemoryQueueAdapter,
  ) {
    const connection = this.getRedisConnection();
    this.isEnabled = !!connection;

    if (!connection) {
      this.queue = null;
      return;
    }

    this.queue = new Queue('akit-jobs', {
      connection,
    });
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  async enqueue(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    if (!this.queue) {
      await this.fallbackAdapter.enqueue(jobName, payload, options);
      return;
    }

    await this.queue.add(jobName, payload, this.mapJobOptions(options));
  }

  private getRedisConnection(): RedisConnectionConfig {
    const url = this.getRedisUrl();
    if (url) {
      return { url };
    }

    const host = this.configService.get<string>('REDIS_HOST');
    if (!host?.trim()) {
      return null;
    }

    const port = this.getRedisPort();
    if (port === null) {
      return null;
    }

    return { host: host.trim(), port };
  }

  private getRedisUrl(): string | null {
    const primary = this.configService.get<string>('REDIS_URL');
    if (primary?.trim()) {
      return primary.trim();
    }

    const legacy = this.configService.get<string>('QUEUE_REDIS_URL');
    return legacy?.trim() ?? null;
  }

  private getRedisPort(): number | null {
    const portValue = this.configService.get<string>('REDIS_PORT');
    if (!portValue) {
      return 6379;
    }

    const parsed = Number(portValue);
    if (!Number.isFinite(parsed)) {
      this.logger.warn(
        `Invalid REDIS_PORT value "${portValue}", disabling BullMQ`,
      );
      return null;
    }

    return parsed;
  }

  private mapJobOptions(options?: QueueJobOptions) {
    if (!options) {
      return undefined;
    }

    const jobOptions: {
      attempts?: number;
      delay?: number;
      backoff?: { type: 'fixed' | 'exponential'; delay: number };
      timeout?: number;
    } = {};

    if (options.attempts !== undefined) {
      jobOptions.attempts = options.attempts;
    }

    if (options.delayMs !== undefined) {
      jobOptions.delay = options.delayMs;
    }

    if (options.backoffMs !== undefined) {
      jobOptions.backoff = {
        type: options.backoffType ?? 'fixed',
        delay: options.backoffMs,
      };
    }

    if (options.timeoutMs !== undefined) {
      jobOptions.timeout = options.timeoutMs;
    }

    return jobOptions;
  }
}
