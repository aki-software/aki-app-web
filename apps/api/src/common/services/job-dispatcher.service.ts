import { Injectable, Logger } from '@nestjs/common';
import { JobNames } from '../jobs/job-names.js';
import { JobHandler } from '../jobs/handlers/job-handler.interface.js';
import { SendEmailHandler } from '../jobs/handlers/send-email.handler.js';
import { GeneratePdfHandler } from '../jobs/handlers/generate-pdf.handler.js';
import { SendReportHandler } from '../jobs/handlers/send-report.handler.js';

@Injectable()
export class JobDispatcherService {
  private readonly logger = new Logger(JobDispatcherService.name);
  private readonly handlers = new Map<JobNames, JobHandler>();

  constructor(
    private readonly sendEmailHandler: SendEmailHandler,
    private readonly generatePdfHandler: GeneratePdfHandler,
    private readonly sendReportHandler: SendReportHandler,
  ) {
    this.handlers.set(JobNames.SendEmail, this.sendEmailHandler);
    this.handlers.set(JobNames.GeneratePdf, this.generatePdfHandler);
    this.handlers.set(JobNames.SendReport, this.sendReportHandler);
  }

  registerHandler(handler: JobHandler): void {
    this.logger.debug(`Registering handler for job=${handler.name}`);
    this.handlers.set(handler.name, handler);
  }

  async dispatch(jobName: JobNames, payload: unknown): Promise<unknown> {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      throw new Error(`Unknown job name: ${String(jobName)}`);
    }

    const context = handler.getJobContext?.(payload) ?? {};
    this.logger.log(
      `job-dispatch start jobName=${jobName} jobId=${context.jobId ?? 'none'} sessionId=${context.sessionId ?? 'none'} voucherId=${context.voucherId ?? 'none'}`,
    );
    const startedAt = Date.now();

    return await this.trackJobDuration(jobName, startedAt, context, () => {
      const timeoutMs = handler.getTimeoutMs?.(payload) ?? 60_000;
      return this.runWithTimeout(timeoutMs, () => handler.handle(payload));
    });
  }

  async dispatchWithRetry(
    jobName: JobNames,
    payload: unknown,
    options: {
      attempts: number;
      backoffMs: number;
      backoffType: 'fixed' | 'exponential';
      delayMs?: number;
    },
  ): Promise<void> {
    const attemptCount = Math.max(1, options.attempts);

    if (options.delayMs && options.delayMs > 0) {
      await this.delay(options.delayMs);
    }

    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      try {
        const handler = this.handlers.get(jobName);
        const context = handler?.getJobContext?.(payload) ?? {};
        this.logger.log(
          `job-dispatch attempt jobName=${jobName} attempt=${attempt}/${attemptCount} jobId=${context.jobId ?? 'none'} sessionId=${context.sessionId ?? 'none'} voucherId=${context.voucherId ?? 'none'}`,
        );
        await this.dispatch(jobName, payload);
        return;
      } catch (error) {
        if (attempt === attemptCount) {
          throw error;
        }

        const waitMs = this.computeBackoffDelay(
          options.backoffMs,
          options.backoffType,
          attempt,
        );
        if (waitMs > 0) {
          await this.delay(waitMs);
        }
      }
    }
  }

  private runWithTimeout<T>(
    timeoutMs: number,
    task: (signal?: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Job timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([task(controller.signal), timeoutPromise]).finally(
      () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      },
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private computeBackoffDelay(
    baseMs: number,
    type: 'fixed' | 'exponential',
    attempt: number,
  ): number {
    if (baseMs <= 0) return 0;
    if (type === 'fixed') return baseMs;
    return baseMs * Math.pow(2, Math.max(0, attempt - 1));
  }

  private async trackJobDuration<T>(
    jobType: string,
    startedAt: number,
    context: { jobId?: string; sessionId?: string; voucherId?: string | null },
    task: () => Promise<T>,
  ): Promise<T> {
    try {
      return await task();
    } finally {
      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `job-duration type=${jobType} durationMs=${elapsedMs} jobId=${context.jobId ?? 'none'} sessionId=${context.sessionId ?? 'none'} voucherId=${context.voucherId ?? 'none'}`,
      );
    }
  }
}
