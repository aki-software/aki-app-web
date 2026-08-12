import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CreateReportAccessAuditInput,
  ReportAccessAudit,
} from './entities/report-access-audit.entity.js';

export class ReportAccessAuditConflictError extends ConflictException {
  readonly code = 'REPORT_ACCESS_AUDIT_CONFLICT';
}

@Injectable()
export class ReportAccessAuditService {
  async append(
    manager: EntityManager,
    input: CreateReportAccessAuditInput,
  ): Promise<ReportAccessAudit> {
    await manager.query(
      `INSERT INTO "report_access_audits" ("report_id", "grant_id", "actor_user_id", "event_type", "scope", "operation_key", "occurred_at") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("operation_key") DO NOTHING RETURNING "id"`,
      [
        input.reportId,
        input.grantId,
        input.actorUserId,
        input.eventType,
        input.scope,
        input.operationKey,
        input.occurredAt,
      ],
    );
    const repository = manager.getRepository(ReportAccessAudit);
    const audit = await repository.findOne({
      where: { operationKey: input.operationKey },
    });
    if (!audit)
      throw new Error('Report access audit insert was not persisted.');
    if (!this.matches(audit, input)) throw new ReportAccessAuditConflictError();
    return audit;
  }

  private matches(
    audit: ReportAccessAudit,
    input: CreateReportAccessAuditInput,
  ): boolean {
    return (
      audit.eventType === input.eventType &&
      audit.reportId === input.reportId &&
      audit.grantId === input.grantId &&
      audit.actorUserId === input.actorUserId &&
      audit.scope === input.scope &&
      new Date(audit.occurredAt).getTime() === input.occurredAt.getTime()
    );
  }
}
