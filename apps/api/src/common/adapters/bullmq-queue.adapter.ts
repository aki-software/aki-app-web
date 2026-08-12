import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueAdapter, QueueJobOptions } from './queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';
import { applyQueueDefaults } from './queue-defaults.js';

@Injectable()
export class BullMQQueueAdapter implements QueueAdapter {
  private readonly logger = new Logger(BullMQQueueAdapter.name);
  readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackAdapter: InMemoryQueueAdapter,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('pdf') private readonly pdfQueue: Queue,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
    @InjectQueue('metrics') private readonly metricsQueue: Queue,
  ) {
    this.isEnabled = process.env.ENABLE_BULLMQ === 'true';
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  async enqueue(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    if (!this.isEnabled) {
      await this.fallbackAdapter.enqueue(jobName, payload, options);
      return;
    }

    const resolvedOptions = applyQueueDefaults(jobName, options);
    const queueOptions = this.mapJobOptions(resolvedOptions);

    switch (jobName) {
      case 'send-email':
        await this.emailQueue.add(jobName, payload, queueOptions);
        break;
      case 'generate-pdf':
        await this.pdfQueue.add(jobName, payload, queueOptions);
        break;
      case 'send-report':
        await this.reportsQueue.add(jobName, payload, queueOptions);
        break;
      case 'calculate_metrics':
        await this.metricsQueue.add(jobName, payload, queueOptions);
        break;
      default:
        this.logger.warn(`Unknown job name: ${jobName}`);
    }
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
