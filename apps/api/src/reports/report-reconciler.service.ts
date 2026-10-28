import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity.js';
import { ReportRendererService } from './report-renderer.service.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const IMMUTABLE_OBJECT_COLLISION = 'Immutable report object collision.';

type StoragePendingAgeBuckets = {
  underOneHour: number;
  oneToTwentyFourHours: number;
  overTwentyFourHours: number;
  unknown: number;
};

function countStoragePendingAgeBuckets(
  reports: Pick<Report, 'storagePendingSince'>[],
  now: number,
): StoragePendingAgeBuckets {
  const buckets: StoragePendingAgeBuckets = {
    underOneHour: 0,
    oneToTwentyFourHours: 0,
    overTwentyFourHours: 0,
    unknown: 0,
  };

  for (const report of reports) {
    const timestamp = report.storagePendingSince?.getTime();
    if (
      timestamp === undefined ||
      !Number.isFinite(timestamp) ||
      timestamp > now
    ) {
      buckets.unknown++;
      continue;
    }

    const age = now - timestamp;
    if (age < ONE_HOUR_MS) {
      buckets.underOneHour++;
    } else if (age < ONE_DAY_MS) {
      buckets.oneToTwentyFourHours++;
    } else {
      buckets.overTwentyFourHours++;
    }
  }

  return buckets;
}

function emptyStoragePendingAgeBuckets(): StoragePendingAgeBuckets {
  return {
    underOneHour: 0,
    oneToTwentyFourHours: 0,
    overTwentyFourHours: 0,
    unknown: 0,
  };
}

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
        JSON.stringify({
          event: 'reconciler.noop',
          storagePendingCount: 0,
          storagePendingAgeBuckets: emptyStoragePendingAgeBuckets(),
        }),
      );
      return;
    }

    const storagePendingAgeBuckets = countStoragePendingAgeBuckets(
      pending,
      Date.now(),
    );
    this.logger.log(
      JSON.stringify({
        event: 'reconciler.start',
        storagePendingCount: pending.length,
        storagePendingAgeBuckets,
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
            reason:
              error instanceof Error &&
              error.message === IMMUTABLE_OBJECT_COLLISION
                ? 'immutable_object_mismatch'
                : 'reconciliation_failed',
          }),
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
    this.logger.log(JSON.stringify({ event: 'reconciler.attempt' }));

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

    if (head) {
      if (
        head.contentHash !== rendered.inputHash ||
        head.version !== String(report.version)
      ) {
        throw new Error(IMMUTABLE_OBJECT_COLLISION);
      }
    } else {
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
        uploadedToStorage: !head,
      }),
    );
  }
}
