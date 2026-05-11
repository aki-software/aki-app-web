import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueAdapter, QueueJobOptions } from './queue.adapter';
import { JobNames } from '../jobs/job-names';
import { JobDispatcherService } from '../services/job-dispatcher.service';

@Injectable()
export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly logger = new Logger(InMemoryQueueAdapter.name);

  constructor(
    private readonly dispatcher: JobDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  isConfigured(): boolean {
    return this.hasQueueUrl() || this.hasRedisSettings();
  }

  async enqueue(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    const resolvedOptions = this.applyDefaults(jobName, options);
    if (!this.isConfigured()) {
      return this.runInline(jobName, payload, resolvedOptions);
    }

    this.logger.warn(
      `Queue configured but adapter is fallback; executing inline job=${jobName}`,
    );
    return this.runInline(jobName, payload, resolvedOptions);
  }

  private runInline(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    const attempts = options?.attempts ?? 1;
    const backoffMs = options?.backoffMs ?? 0;
    const backoffType = options?.backoffType ?? 'fixed';
    const delayMs = options?.delayMs ?? 0;

    void this.dispatcher
      .dispatchWithRetry(jobName as JobNames, payload, {
        attempts,
        backoffMs,
        backoffType,
        delayMs,
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Inline job failed job=${jobName} error=${message}`);
      });

    return Promise.resolve();
  }

  private hasQueueUrl(): boolean {
    const url = this.configService.get<string>('QUEUE_REDIS_URL');
    return !!url?.trim();
  }

  private hasRedisSettings(): boolean {
    const url = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST');
    return !!url?.trim() || !!host?.trim();
  }

  private applyDefaults(
    jobName: string,
    options?: QueueJobOptions,
  ): QueueJobOptions | undefined {
    const shouldDefault = new Set<string>([
      JobNames.SendEmail,
      JobNames.SendReport,
      JobNames.GeneratePdf,
    ]).has(jobName);

    if (!shouldDefault) {
      return options;
    }

    return {
      ...options,
      attempts: options?.attempts ?? 3,
      backoffMs: options?.backoffMs ?? 60_000,
      backoffType: options?.backoffType ?? 'exponential',
    };
  }
}
