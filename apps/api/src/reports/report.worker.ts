import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity.js';
import { ReportService } from '../sessions/services/report.service.js';
import { Report, ReportStatus } from './entities/report.entity.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';
import { ReportRendererService } from './report-renderer.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportGeneratedEvent } from '../events/domain-events.js';

@Processor('reports', { concurrency: 1 })
export class ReportWorker extends WorkerHost {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly data: ReportService,
    private readonly renderer: ReportRendererService,
    private readonly storage: PrivateReportStorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(
    job: Job<{ reportId: string; targetEmail?: string }, unknown, string>,
  ) {
    const report = await this.reports.findOne({
      where: { id: job.data.reportId },
    });
    if (!report) throw new Error('Report not found.');
    if (report.status === ReportStatus.AVAILABLE) {
      if (job.data.targetEmail) {
        const session = await this.sessions
          .createQueryBuilder('session')
          .leftJoinAndSelect('session.results', 'results')
          .where('session.id = :id', { id: report.sessionId })
          .addOrderBy('results.percentage', 'DESC')
          .addOrderBy('results.weightedScore', 'DESC')
          .addOrderBy('results.categoryId', 'ASC')
          .getOne();
        if (session) {
          const reportData = await this.data.buildReportData(session);
          const pdfBuffer =
            (await this.storage.get(
              `reports/${report.sessionId}/v${report.version}.pdf`,
            )) ?? undefined;

          await this.eventEmitter.emitAsync(
            'report.generated',
            new ReportGeneratedEvent(
              null,
              job.data.targetEmail,
              pdfBuffer,
              reportData.summary,
            ),
          );
        }
      }
      return { inputHash: report.contentHash, byteLength: 0 };
    }
    try {
      if (report.status === ReportStatus.PENDING) {
        report.markGenerating();
        await this.reports.save(report);
      }
      const session = await this.sessions
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.results', 'results')
        .where('session.id = :id', { id: report.sessionId })
        .addOrderBy('results.percentage', 'DESC')
        .addOrderBy('results.weightedScore', 'DESC')
        .addOrderBy('results.categoryId', 'ASC')
        .getOne();
      if (!session) throw new Error('Report session not found.');

      const reportData = await this.data.buildReportData(session);
      const rendered = await this.renderer.render({
        locale: 'es-AR',
        timeZone: 'America/Argentina/Buenos_Aires',
        generatedAt: report.createdAt.toISOString(),
        assessmentAt: session.sessionDate.toISOString(),
        templateVersion: '1',
        reportVersion: report.version,
        data: reportData,
      });

      // Storage upload is best-effort: if R2/S3 is not configured or fails,
      // we still send the email with the in-memory buffer.
      let storageAvailable = false;
      try {
        const objectKey = `reports/${report.sessionId}/v${report.version}.pdf`;
        const head = await this.storage.head(objectKey);
        if (
          head &&
          (head.contentHash !== rendered.inputHash ||
            head.version !== String(report.version))
        )
          throw new Error('Immutable report object collision.');
        if (!head)
          await this.storage.put(objectKey, rendered.pdf, {
            contentHash: rendered.inputHash,
            version: report.version,
          });
        report.markAvailable({
          objectKey,
          contentHash: rendered.inputHash,
          generatedAt: report.createdAt,
        });
        await this.reports.save(report);
        storageAvailable = true;
      } catch (storageError) {
        // Log but don't fail the job — the PDF exists in memory and can be emailed
        console.warn(
          '[ReportWorker] Storage upload failed, proceeding without persistence:',
          (storageError as Error).message,
        );
      }

      if (job.data.targetEmail) {
        await this.eventEmitter.emitAsync(
          'report.generated',
          new ReportGeneratedEvent(
            null,
            job.data.targetEmail,
            rendered.pdf,
            reportData.summary,
          ),
        );
      }

      return {
        inputHash: rendered.inputHash,
        byteLength: rendered.pdf.byteLength,
        storageAvailable,
      };
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        report.markFailed();
        await this.reports.save(report);
      }
      throw error;
    }
  }
}
