import { createHash } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity.js';
import { ReportService } from '../sessions/services/report.service.js';
import {
  Report,
  ReportEntitlementSource,
  ReportStatus,
} from './entities/report.entity.js';
import { ReportDeliveryService } from './report-delivery.service.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectQueue('reports') private readonly queue: Queue,
    private readonly reportData: ReportService,
    private readonly delivery: ReportDeliveryService,
  ) {}

  async requestGeneration(
    sessionId: string,
    targetEmail?: string,
  ): Promise<{ reportId: string; jobId: string }> {
    const session = await this.sessions
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .where('session.id = :id', { id: sessionId })
      .addOrderBy('results.percentage', 'DESC')
      .addOrderBy('results.weightedScore', 'DESC')
      .addOrderBy('results.categoryId', 'ASC')
      .getOne();
    if (!session) throw new NotFoundException('Session not found.');
    let report = await this.reports.findOne({
      where: { sessionId, version: 1 },
    });
    if (!report) report = await this.create(session);
    if (
      report.status !== ReportStatus.AVAILABLE &&
      !report.inputSnapshot
    ) {
      throw new BadRequestException(
        'Legacy report cannot be generated because its immutable input snapshot is unavailable.',
      );
    }
    const jobId = `report-${report.id}-v${report.version}`;
    if (report.status === ReportStatus.FAILED) {
      report.retry();
      await this.reports.save(report);
      const job = await this.queue.getJob(jobId);
      if (job) await job.retry();
      else await this.add(report, jobId, targetEmail);
    } else if (report.status === ReportStatus.PENDING) {
      await this.add(report, jobId, targetEmail);
    } else if (report.status === ReportStatus.STORAGE_PENDING) {
      const job = await this.queue.getJob(jobId);
      if (job) await job.retry();
      else await this.add(report, jobId, targetEmail);
    } else if (report.status === ReportStatus.AVAILABLE && targetEmail) {
      const deliveryJobId = `report-${report.id}-deliver-${Date.now()}`;
      await this.add(report, deliveryJobId, targetEmail);
      return { reportId: report.id, jobId: deliveryJobId };
    }
    return { reportId: report.id, jobId };
  }

  async enqueueDelivery(
    reportId: string,
    recipientEmail: string,
  ): Promise<{ queued: boolean; idempotent: boolean }> {
    const result = await this.delivery.request(reportId, recipientEmail);
    if (!result.queued) return result;
    const recipientHash = createHash('sha256')
      .update(recipientEmail.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
    const jobId = `report-${reportId}-deliver-${recipientHash}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      if ((await job.getState()) === 'failed') await job.retry();
      return result;
    }
    await this.queue.add(
      'deliver',
      { reportId, targetEmail: recipientEmail.trim().toLowerCase() },
      { jobId },
    );
    return result;
  }

  private async create(session: Session): Promise<Report> {
    const entitlement = this.entitlement(session);
    const entitledPatientId = session.patientId ?? null;
    const entitledUserId = entitledPatientId ? null : session.therapistUserId ?? null;
    if (!entitledPatientId && !entitledUserId) {
      throw new Error('No entitled principal found for session');
    }

    const generatedAt = new Date();
    const pending = Report.createPending({
      sessionId: session.id,
      entitledUserId,
      entitledPatientId,
      entitlementSource: entitlement,
      voucherId:
        entitlement === ReportEntitlementSource.VOUCHER
          ? session.voucherId
          : null,
      generatedAt,
      inputSnapshot: {
        generatedAt: generatedAt.toISOString(),
        assessmentAt: session.sessionDate.toISOString(),
        data: await this.reportData.buildReportData(session),
      },
    });
    try {
      return await this.reports.save(pending);
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const report = await this.reports.findOne({
        where: { sessionId: session.id, version: 1 },
      });
      if (!report) throw error;
      return report;
    }
  }

  private entitlement(session: Session): ReportEntitlementSource {
    if (!session.patientId && !session.therapistUserId)
      throw new BadRequestException('Report provenance cannot be proven.');
    if (session.voucherId) return ReportEntitlementSource.VOUCHER;
    if (session.reportUnlockedAt && session.reportUnlockPurchaseToken)
      return ReportEntitlementSource.GOOGLE_PLAY;
    throw new BadRequestException('Session has not been paid or unlocked.');
  }

  private add(
    report: Report,
    jobId: string,
    targetEmail?: string,
  ): Promise<unknown> {
    return this.queue.add(
      'generate',
      { reportId: report.id, targetEmail },
      { jobId },
    );
  }
}
