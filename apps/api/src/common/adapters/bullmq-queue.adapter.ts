import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueAdapter, QueueJobOptions } from './queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';
import { applyQueueDefaults } from './queue-defaults.js';
import { getRedisConnection } from '../utils/redis.utils.js';

@Injectable()
export class BullMQQueueAdapter implements QueueAdapter {
  private readonly logger = new Logger(BullMQQueueAdapter.name);
  private readonly queue: Queue | null;
  readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackAdapter: InMemoryQueueAdapter,
  ) {
    const connection = getRedisConnection(this.configService);
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

    const resolvedOptions = applyQueueDefaults(jobName, options);
    await this.queue.add(jobName, payload, this.mapJobOptions(resolvedOptions));
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
