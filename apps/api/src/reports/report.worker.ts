import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  InjectQueue,
  Processor,
  WorkerHost,
  OnWorkerEvent,
} from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity.js';
import type { ReportDeliveryAudience } from '../events/domain-events.js';
import { ReportDeliveryService } from './report-delivery.service.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';
import { ReportRendererService } from './report-renderer.service.js';

type ReportJobData = {
  reportId: string;
  targetEmail?: string;
  force?: boolean;
  audience?: ReportDeliveryAudience;
};

@Processor('reports', { concurrency: 1 })
export class ReportWorker extends WorkerHost {
  private readonly logger = new Logger(ReportWorker.name);

  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly renderer: ReportRendererService,
    private readonly storage: PrivateReportStorageService,
    private readonly delivery: ReportDeliveryService,
    @InjectQueue('reports') private readonly queue: Queue,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`, error.stack);
  }

  async process(job: Job<ReportJobData, unknown, string>) {
    if (job.name === 'deliver') return this.processDelivery(job);

    const report = await this.reports.findOne({
      where: { id: job.data.reportId },
    });
    if (!report) throw new Error('Report not found.');

    if (report.status === ReportStatus.AVAILABLE) {
      return this.processDelivery(job);
    }

    if (!report.inputSnapshot) {
      if (report.status !== ReportStatus.FAILED) {
        if (
          report.status === ReportStatus.PENDING ||
          report.status === ReportStatus.GENERATING
        ) {
          report.markFailed();
        } else {
          report.status = ReportStatus.FAILED;
        }
        await this.reports.save(report);
      }
      this.logger.warn(
        `Skipping legacy report ${report.id}: immutable input snapshot is unavailable.`,
      );
      return {
        skipped: true,
        reason: 'Legacy report has no immutable input snapshot.',
      };
    }

    try {
      if (report.status === ReportStatus.PENDING) {
        report.markGenerating();
        await this.reports.save(report);
      }

      const rendered = await this.renderer.render({
        locale: 'es-AR',
        timeZone: 'America/Argentina/Buenos_Aires',
        generatedAt: report.inputSnapshot.generatedAt,
        assessmentAt: report.inputSnapshot.assessmentAt,
        templateVersion: '1',
        reportVersion: report.version,
        data: report.inputSnapshot.data as unknown as Record<string, unknown>,
      });

      const objectKey = this.storage.buildReportObjectKey(
        report.sessionId,
        report.version,
      );
      let head;
      try {
        head = await this.storage.head(objectKey);
      } catch (storageError) {
        await this.deferStorageRetry(
          report,
          job.data.targetEmail,
          rendered.pdf,
          storageError,
          job.data.force ?? false,
          job.data.audience ?? 'PATIENT',
        );
        throw storageError;
      }
      if (
        head &&
        (head.contentHash !== rendered.inputHash ||
          head.version !== String(report.version))
      ) {
        throw new Error('Immutable report object collision.');
      }
      if (!head) {
        try {
          await this.storage.put(objectKey, rendered.pdf, {
            contentHash: rendered.inputHash,
            version: report.version,
          });
        } catch (storageError) {
          await this.deferStorageRetry(
            report,
            job.data.targetEmail,
            rendered.pdf,
            storageError,
            job.data.force ?? false,
            job.data.audience ?? 'PATIENT',
          );
          throw storageError;
        }
      }
      report.markAvailable({
        objectKey,
        contentHash: rendered.inputHash,
        generatedAt: new Date(report.inputSnapshot.generatedAt),
      });
      await this.reports.save(report);
      if (job.data.targetEmail) {
        await this.queue.add(
          'deliver',
          {
            reportId: report.id,
            targetEmail: job.data.targetEmail.trim().toLowerCase(),
            ...(job.data.force ? { force: true } : {}),
            ...(job.data.audience === 'EVALUATOR'
              ? { audience: 'EVALUATOR' as const }
              : {}),
          },
          {
            jobId: this.deliveryJobId(
              report.id,
              job.data.targetEmail,
              job.data.force ?? false,
            ),
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          },
        );
      }
      return {
        inputHash: rendered.inputHash,
        byteLength: rendered.pdf.byteLength,
        storageAvailable: true,
      };
    } catch (error) {
      if (
        (report.status === ReportStatus.PENDING ||
          report.status === ReportStatus.GENERATING) &&
        job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
      ) {
        report.markFailed();
        await this.reports.save(report);
      }
      throw error;
    }
  }

  private async processDelivery(job: Job<ReportJobData, unknown, string>) {
    const report = await this.reports.findOne({
      where: { id: job.data.reportId },
    });
    if (!report) throw new Error('Report not found.');
    if (report.status !== ReportStatus.AVAILABLE) {
      throw new Error('Only available reports can be delivered.');
    }

    try {
      await this.deliverStoredReport(
        report,
        job.data.targetEmail,
        job.data.force ?? false,
        job.data.audience ?? 'PATIENT',
      );
      return { inputHash: report.contentHash, byteLength: 0 };
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        this.logger.error(
          `Report delivery failed permanently for ${report.id}: ${(error as Error).message}`,
        );
      }
      throw error;
    }
  }

  private async deferStorageRetry(
    report: Report,
    targetEmail: string | undefined,
    pdfBuffer: Buffer,
    storageError: unknown,
    force: boolean,
    audience: ReportDeliveryAudience,
  ): Promise<void> {
    report.markStoragePending();
    await this.reports.save(report);
    if (audience === 'EVALUATOR') {
      await this.delivery.deliver(report, targetEmail, pdfBuffer, force, audience);
    } else if (force) {
      await this.delivery.deliver(report, targetEmail, pdfBuffer, true);
    } else {
      await this.delivery.deliver(report, targetEmail, pdfBuffer);
    }
    this.logger.warn(
      `Storage upload failed; report ${report.id} retained for retry: ${(storageError as Error).message}`,
    );
  }

  private async deliverStoredReport(
    report: Report,
    targetEmail: string | undefined,
    force: boolean,
    audience: ReportDeliveryAudience,
  ): Promise<void> {
    if (!targetEmail) return;
    const objectKey =
      report.objectKey ??
      this.storage.buildReportObjectKey(report.sessionId, report.version);
    const pdfBuffer = await this.storage.get(objectKey);
    if (!pdfBuffer) throw new Error('Stored report PDF not found.');
    if (audience === 'EVALUATOR') {
      await this.delivery.deliver(report, targetEmail, pdfBuffer, force, audience);
    } else if (force) {
      await this.delivery.deliver(report, targetEmail, pdfBuffer, true);
    } else {
      await this.delivery.deliver(report, targetEmail, pdfBuffer);
    }
  }

  private deliveryJobId(
    reportId: string,
    recipientEmail: string,
    force: boolean,
  ): string {
    const recipientHash = createHash('sha256')
      .update(recipientEmail.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
    const base = `report-${reportId}-deliver-${recipientHash}`;
    return force ? `${base}-force-${randomUUID()}` : base;
  }
}
