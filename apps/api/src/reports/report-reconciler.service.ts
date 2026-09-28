import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity.js';
import { ReportRendererService } from './report-renderer.service.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';

@Injectable()
export class ReportReconcilerService {
  private readonly logger = new Logger(ReportReconcilerService.name);

  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly renderer: ReportRendererService,
    private readonly storage: PrivateReportStorageService,
  ) {}

  @Cron('0 * * * *')
  async reconcileStoragePending(): Promise<void> {
    const pending = await this.reports.find({
      where: { status: ReportStatus.STORAGE_PENDING },
    });

    if (pending.length === 0) {
      this.logger.log(
        JSON.stringify({ event: 'reconciler.noop', storagePendingCount: 0 }),
      );
      return;
    }

    this.logger.log(
      JSON.stringify({
        event: 'reconciler.start',
        storagePendingCount: pending.length,
      }),
    );

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const report of pending) {
      if (!report.inputSnapshot) {
        this.logger.warn(
          JSON.stringify({
            event: 'reconciler.skip',
            reportId: report.id,
            reason: 'no_input_snapshot',
          }),
        );
        skipped++;
        continue;
      }

      try {
        await this.reconcileOne(report);
        succeeded++;
      } catch (error) {
        failed++;
        this.logger.error(
          JSON.stringify({
            event: 'reconciler.error',
            reportId: report.id,
            error: (error as Error).message,
          }),
          (error as Error).stack,
        );
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'reconciler.done',
        total: pending.length,
        succeeded,
        failed,
        skipped,
      }),
    );
  }

  private async reconcileOne(report: Report): Promise<void> {
    this.logger.log(
      JSON.stringify({ event: 'reconciler.attempt', reportId: report.id }),
    );

    const rendered = await this.renderer.render({
      locale: 'es-AR',
      timeZone: 'America/Argentina/Buenos_Aires',
      generatedAt: report.inputSnapshot!.generatedAt,
      assessmentAt: report.inputSnapshot!.assessmentAt,
      templateVersion: '1',
      reportVersion: report.version,
      data: report.inputSnapshot!.data as unknown as Record<string, unknown>,
    });

    const objectKey = this.storage.buildReportObjectKey(
      report.sessionId,
      report.version,
    );

    const head = await this.storage.head(objectKey);

    if (!head) {
      await this.storage.put(objectKey, rendered.pdf, {
        contentHash: rendered.inputHash,
        version: report.version,
      });
    }

    report.markAvailable({
      objectKey,
      contentHash: rendered.inputHash,
      generatedAt: new Date(report.inputSnapshot!.generatedAt),
    });
    await this.reports.save(report);

    this.logger.log(
      JSON.stringify({
        event: 'reconciler.success',
        reportId: report.id,
        objectKey,
        contentHash: rendered.inputHash,
        uploadedToStorage: !head,
      }),
    );
  }
}
