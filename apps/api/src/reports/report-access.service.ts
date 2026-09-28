import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ReportAccessAuditEvent } from './entities/report-access-audit.entity.js';
import { ReportStatus } from './entities/report.entity.js';
import { Report } from './entities/report.entity.js';
import type { ReportGrantScope } from './entities/report-grant.entity.js';
import { ReportAccessAuditService } from './report-access-audit.service.js';
import { RequestContext, isSystemContext } from '../common/context/request-context.js';

export interface ConsentPolicyPort {
  permits(ctx: RequestContext, reportId: string): Promise<boolean>;
}
export const REPORT_CONSENT_POLICY = Symbol('REPORT_CONSENT_POLICY');

function contextToAuditScope(ctx: RequestContext): ReportGrantScope {
  if (isSystemContext(ctx)) return 'SYSTEM';
  if (ctx.kind === 'institution') {
    return ctx.rawRole === 'INSTITUTION_ADMIN' ? 'INSTITUTION' : (ctx.rawRole as ReportGrantScope);
  }
  return ctx.rawRole as ReportGrantScope;
}

@Injectable()
export class ReportAccessService {
  constructor(
    private readonly data: DataSource,
    private readonly audit: ReportAccessAuditService,
    @Inject(REPORT_CONSENT_POLICY) private readonly consent: ConsentPolicyPort,
  ) {}

  async status(reportId: string, ctx: RequestContext) {
    return this.data.transaction(async (manager) =>
      this.authorize(manager, reportId, ctx),
    );
  }

  async download(reportId: string, ctx: RequestContext): Promise<Report> {
    return this.data.transaction(async (manager) => {
      const report = await this.authorize(manager, reportId, ctx);
      this.assertDownloadable(report);
      return report;
    });
  }

  async downloadForSession(
    sessionId: string,
    ctx: RequestContext,
  ): Promise<Report> {
    return this.data.transaction(async (manager) => {
      const report = await manager.getRepository(Report).findOne({
        where: { sessionId },
        order: { version: 'DESC' },
      });
      if (!report)
        throw new NotFoundException('No report exists for this session.');
      await this.authorizeReport(manager, report, ctx);
      this.assertDownloadable(report);
      return report;
    });
  }

  async authorizeDelivery(
    reportId: string,
    ctx: RequestContext,
    recipientEmail: string,
    operationKey: string,
  ): Promise<Report> {
    return this.data.transaction(async (manager) => {
      const report = await this.authorize(manager, reportId, ctx);
      if (!report.availableUntil || report.availableUntil <= new Date())
        throw new ForbiddenException('Report is unavailable.');
      if (!report.objectKey) throw new NotFoundException('Report not found.');
      await this.audit.append(manager, {
        eventType: ReportAccessAuditEvent.DELIVERY_AUTHORIZED,
        reportId: report.id,
        grantId: null,
        actorUserId: (ctx.kind === 'system' ? null : ctx.userId) ?? null,
        scope: contextToAuditScope(ctx),
        operationKey,
        occurredAt: new Date(),
        recipientEmail: recipientEmail.trim().toLowerCase(),
        outcome: 'AUTHORIZED',
      });
      return report;
    });
  }

  async recordDownload(
    report: Report,
    ctx: RequestContext,
  ): Promise<void> {
    await this.data.transaction(async (manager) => {
      const occurredAt = new Date();
      await manager.getRepository(Report).update(report.id, {
        lastAccessedAt: occurredAt,
      });
      await this.audit.append(manager, {
        eventType: ReportAccessAuditEvent.DOWNLOAD_ACCESSED,
        reportId: report.id,
        grantId: null,
        actorUserId: (ctx.kind === 'system' ? null : ctx.userId) ?? null,
        scope: contextToAuditScope(ctx),
        operationKey: randomUUID(),
        occurredAt,
      });
    });
  }

  async issue(
    reportId: string,
    ctx: RequestContext,
    operationKey: string,
  ) {
    return this.grant(
      reportId,
      ctx,
      operationKey,
      ReportAccessAuditEvent.GRANT_ISSUED,
    );
  }

  async renew(
    reportId: string,
    ctx: RequestContext,
    operationKey: string,
  ) {
    return this.grant(
      reportId,
      ctx,
      operationKey,
      ReportAccessAuditEvent.GRANT_RENEWED,
    );
  }

  private async grant(
    reportId: string,
    ctx: RequestContext,
    operationKey: string,
    eventType:
      | ReportAccessAuditEvent.GRANT_ISSUED
      | ReportAccessAuditEvent.GRANT_RENEWED,
  ) {
    return this.data.transaction(async (manager) => {
      const report = await this.authorize(manager, reportId, ctx);
      if (!report.availableUntil || report.availableUntil <= new Date())
        throw new ForbiddenException('Report is unavailable.');
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      const rows = await manager.query(
        `INSERT INTO "report_grants" ("report_id", "token_hash", "scope", "expires_at") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [
          report.id,
          hash,
          contextToAuditScope(ctx),
          new Date(
            Math.min(Date.now() + 15 * 60_000, report.availableUntil.getTime()),
          ),
        ],
      );
      await this.audit.append(manager, {
        eventType,
        reportId,
        grantId: rows[0]?.id ?? null,
        actorUserId: (ctx.kind === 'system' ? null : ctx.userId) ?? null,
        scope: contextToAuditScope(ctx),
        operationKey,
        occurredAt: new Date(),
      });
      return {
        token,
        expiresAt: new Date(
          Math.min(Date.now() + 15 * 60_000, report.availableUntil.getTime()),
        ),
      };
    });
  }

  async consume(
    token: string,
    ctx: RequestContext,
    operationKey: string,
  ): Promise<void> {
    await this.data.transaction(async (manager) => {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const rows = await manager.query(
        `UPDATE "report_grants" SET "used_at" = now() WHERE "token_hash" = $1 AND "used_at" IS NULL AND "expires_at" > now() RETURNING "id", "report_id"`,
        [tokenHash],
      );
      const grant = rows[0];
      if (!grant) throw new NotFoundException('Grant is used or expired.');
      await this.authorize(manager, grant.report_id, ctx);
      await this.audit.append(manager, {
        eventType: ReportAccessAuditEvent.GRANT_CONSUMED,
        reportId: grant.report_id,
        grantId: grant.id,
        actorUserId: (ctx.kind === 'system' ? null : ctx.userId) ?? null,
        scope: contextToAuditScope(ctx),
        operationKey,
        occurredAt: new Date(),
      });
    });
  }

  private assertDownloadable(report: Report): void {
    switch (report.status) {
      case ReportStatus.AVAILABLE:
        if (!report.availableUntil || report.availableUntil <= new Date()) {
          throw new GoneException(
            'Report is unavailable because it has expired.',
          );
        }
        if (!report.objectKey) {
          throw new NotFoundException('Report file not found in storage.');
        }
        return;
      case ReportStatus.PENDING:
        throw new ConflictException('Report is pending generation.');
      case ReportStatus.GENERATING:
        throw new ConflictException('Report is being generated.');
      case ReportStatus.STORAGE_PENDING:
        throw new ConflictException('Report is waiting for storage.');
      case ReportStatus.EXPIRED:
        throw new GoneException(
          'Report is unavailable because it has expired.',
        );
      case ReportStatus.FAILED:
        throw new BadRequestException('Report generation failed.');
    }
  }

  private async authorize(
    manager: EntityManager,
    reportId: string,
    ctx: RequestContext,
  ): Promise<Report> {
    const report = await manager
      .getRepository(Report)
      .findOne({ where: { id: reportId } });
    if (!report || report.status !== ReportStatus.AVAILABLE)
      throw new NotFoundException('Report not found.');
    return this.authorizeReport(manager, report, ctx);
  }

  private async authorizeReport(
    manager: EntityManager,
    report: Report,
    ctx: RequestContext,
  ): Promise<Report> {
    if (isSystemContext(ctx)) return report;

    if (ctx.kind === 'personal' || (ctx.kind === 'institution' && ctx.rawRole === 'PATIENT')) {
      const patientId = await this.resolvePatientId(manager, ctx);
      if (patientId && report.entitledPatientId === patientId) return report;
    }

    if (
      ctx.kind === 'institution' &&
      (ctx.rawRole === 'THERAPIST' || ctx.rawRole === 'INSTITUTION_ADMIN') &&
      (await this.consent.permits(ctx, report.id))
    ) {
      return report;
    }

    throw new ForbiddenException('Report access is not permitted.');
  }

  private async resolvePatientId(
    manager: EntityManager,
    ctx: RequestContext,
  ): Promise<string | null> {
    if (isSystemContext(ctx)) return null;

    if (ctx.userId) {
      const patients = await manager.query(
        `SELECT "id" FROM "patients" WHERE "firebase_uid" = $1 LIMIT 1`,
        [ctx.userId],
      );
      if (patients[0]?.id) return patients[0].id;
    }

    if (ctx.email) {
      const patients = await manager.query(
        `SELECT "id" FROM "patients" WHERE "email" = $1 LIMIT 1`,
        [ctx.email.trim().toLowerCase()],
      );
      if (patients[0]?.id) return patients[0].id;
    }
    return null;
  }
}
