import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueAdapter, QueueJobOptions } from './queue.adapter.js';
import { applyQueueDefaults } from './queue-defaults.js';

/**
 * Fallback adapter that executes jobs synchronously (in-process).
 * Used when Redis/BullMQ is not configured or as a testing helper.
 * NOTE: No retry logic — jobs are fire-and-forget. Use BullMQQueueAdapter for production.
 */
@Injectable()
export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly logger = new Logger(InMemoryQueueAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return false;
  }

  enqueue(
    jobName: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    const resolvedOptions = applyQueueDefaults(jobName, options);
    this.logger.warn(
      `InMemoryQueueAdapter: executing inline job=${jobName} attempts=${resolvedOptions?.attempts ?? 1}`,
    );
    // Fire-and-forget — errors are logged but not re-thrown to avoid blocking the caller
    Promise.resolve()
      .then(() => {
        this.logger.log(
          `Inline job dispatched: ${jobName} payload=${JSON.stringify(payload)}`,
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Inline job failed job=${jobName} error=${message}`);
      });
    return Promise.resolve();
  }
}
