import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ReportGeneratedEvent,
  ReportFailedEvent,
} from '../events/domain-events';

@Processor('reports', {
  concurrency: 1,
})
export class ReportWorker extends WorkerHost {
  private readonly logger = new Logger(ReportWorker.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing report job ${job.id} for data:`, job.data);
    try {
      // Simulate report generation
      // TODO: implement actual PDF generation
      const reportUrl = `https://s3.bucket/reports/report-${job.id}.pdf`;

      // Emit success event
      await this.eventEmitter.emitAsync(
        'report.generated',
        new ReportGeneratedEvent(reportUrl, job.data.requestedByEmail),
      );

      this.logger.log(`Successfully generated report for job ${job.id}`);
      return reportUrl;
    } catch (error) {
      this.logger.error(`Error processing report job ${job.id}`, error);
      throw error; // Let BullMQ handle retries
    }
  }

  // Hook into failure after retries are exhausted to emit DLQ event
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    // If attemptsMade >= opts.attempts, it will go to DLQ (or is permanently failed)
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error(
        `Job ${job.id} has permanently failed after ${job.attemptsMade} attempts. Emitting report.failed`,
      );
      this.eventEmitter.emit(
        'report.failed',
        new ReportFailedEvent(job.id!, error.message),
      );
    }
  }
}
