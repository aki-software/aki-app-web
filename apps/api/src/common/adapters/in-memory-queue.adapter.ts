import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueAdapter, QueueJobOptions } from './queue.adapter';
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
    if (!this.isConfigured()) {
      return this.runInline(jobName, payload, options);
    }

    this.logger.warn(
      `Queue configured but adapter is fallback; executing inline job=${jobName}`,
    );
    return this.runInline(jobName, payload, options);
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
      .dispatchWithRetry(jobName, payload, {
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
}
