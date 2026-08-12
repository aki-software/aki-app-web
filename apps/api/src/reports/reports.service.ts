import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity.js';
import {
  Report,
  ReportEntitlementSource,
  ReportStatus,
} from './entities/report.entity.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectQueue('reports') private readonly queue: Queue,
  ) {}

  async requestGeneration(
    sessionId: string,
  ): Promise<{ reportId: string; jobId: string }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');
    let report = await this.reports.findOne({
      where: { sessionId, version: 1 },
    });
    if (!report) report = await this.create(session);
    const jobId = `report-${report.id}-v${report.version}`;
    if (report.status === ReportStatus.FAILED) {
      report.retry();
      await this.reports.save(report);
      const job = await this.queue.getJob(jobId);
      if (job) await job.retry();
      else await this.add(report, jobId);
    } else if (report.status === ReportStatus.PENDING) {
      await this.add(report, jobId);
    }
    return { reportId: report.id, jobId };
  }

  private async create(session: Session): Promise<Report> {
    const entitlement = this.entitlement(session);
    const pending = Report.createPending({
      sessionId: session.id,
      entitledUserId: session.patientId!,
      entitlementSource: entitlement,
      voucherId:
        entitlement === ReportEntitlementSource.VOUCHER
          ? session.voucherId
          : null,
      generatedAt: session.createdAt,
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
    if (!session.patientId)
      throw new Error('Report provenance cannot be proven.');
    if (session.voucherId) return ReportEntitlementSource.VOUCHER;
    if (session.reportUnlockedAt && session.reportUnlockPurchaseToken)
      return ReportEntitlementSource.GOOGLE_PLAY;
    throw new Error('Report provenance cannot be proven.');
  }

  private add(report: Report, jobId: string): Promise<unknown> {
    return this.queue.add('generate', { reportId: report.id }, { jobId });
  }
}
