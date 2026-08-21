import { createHash, randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '@akit/contracts';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity.js';
import type { SessionScope } from '../sessions/types/session-scope.type.js';
import { ReportService } from '../sessions/services/report.service.js';
import {
  Report,
  ReportEntitlementSource,
  ReportStatus,
} from './entities/report.entity.js';
import type { ReportDeliveryAudience } from '../events/domain-events.js';
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
    scope?: SessionScope,
    force = false,
    audience: ReportDeliveryAudience = this.deliveryAudience(scope),
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
    if (!report) report = await this.create(session, scope);
    if (report.status !== ReportStatus.AVAILABLE && !report.inputSnapshot) {
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
      else await this.add(report, jobId, targetEmail, force, audience);
    } else if (report.status === ReportStatus.PENDING) {
      await this.add(report, jobId, targetEmail, force, audience);
    } else if (report.status === ReportStatus.STORAGE_PENDING) {
      const job = await this.queue.getJob(jobId);
      if (job) await job.retry();
      else await this.add(report, jobId, targetEmail, force, audience);
    } else if (report.status === ReportStatus.AVAILABLE && targetEmail) {
      const deliveryJobId = this.deliveryJobId(report.id, targetEmail, force);
      await this.enqueueDelivery(report.id, targetEmail, force, audience);
      return { reportId: report.id, jobId: deliveryJobId };
    }
    return { reportId: report.id, jobId };
  }

  async enqueueDelivery(
    reportId: string,
    recipientEmail: string,
    force = false,
    audience: ReportDeliveryAudience = 'PATIENT',
  ): Promise<{ queued: boolean; idempotent: boolean }> {
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const result = force
      ? await this.delivery.request(reportId, normalizedEmail, true)
      : await this.delivery.request(reportId, normalizedEmail);
    if (!result.queued) return result;
    const jobId = this.deliveryJobId(reportId, normalizedEmail, force);
    const job = force ? undefined : await this.queue.getJob(jobId);
    if (job) {
      if ((await job.getState()) === 'failed') await job.retry();
      return result;
    }
    await this.queue.add(
      'deliver',
      {
        reportId,
        targetEmail: normalizedEmail,
        ...(force ? { force: true } : {}),
        ...(audience === 'EVALUATOR' ? { audience: 'EVALUATOR' as const } : {}),
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    return result;
  }

  private async create(
    session: Session,
    scope?: SessionScope,
  ): Promise<Report> {
    const entitlement = this.entitlement(session, scope);
    const entitledPatientId = session.patientId ?? null;
    const entitledUserId = entitledPatientId
      ? null
      : (session.therapistUserId ?? null);
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

  private entitlement(
    session: Session,
    scope?: SessionScope,
  ): ReportEntitlementSource {
    if (!session.patientId && !session.therapistUserId)
      throw new BadRequestException('Report provenance cannot be proven.');
    if (session.voucherId) return ReportEntitlementSource.VOUCHER;
    if (session.reportUnlockedAt && session.reportUnlockPurchaseToken)
      return ReportEntitlementSource.GOOGLE_PLAY;
    if (
      scope?.role === UserRole.INSTITUTION_ADMIN &&
      scope.institutionId &&
      scope.institutionId === session.institutionId
    ) {
      return ReportEntitlementSource.INSTITUTION;
    }
    throw new BadRequestException('Session has not been paid or unlocked.');
  }

  private deliveryAudience(scope?: SessionScope): ReportDeliveryAudience {
    return scope?.role === UserRole.THERAPIST ||
      scope?.role === UserRole.INSTITUTION_ADMIN
      ? 'EVALUATOR'
      : 'PATIENT';
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

  private add(
    report: Report,
    jobId: string,
    targetEmail?: string,
    force = false,
    audience: ReportDeliveryAudience = 'PATIENT',
  ): Promise<unknown> {
    return this.queue.add(
      'generate',
      {
        reportId: report.id,
        targetEmail,
        ...(force ? { force: true } : {}),
        ...(audience === 'EVALUATOR' ? { audience: 'EVALUATOR' as const } : {}),
      },
      { jobId },
    );
  }
}
