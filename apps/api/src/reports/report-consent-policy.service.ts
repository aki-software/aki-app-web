import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ConsentPolicyPort } from './report-access.service.js';
import { RequestContext, isSystemContext } from '../common/context/request-context.js';

@Injectable()
export class ReportConsentPolicyService implements ConsentPolicyPort {
  constructor(private readonly data: DataSource) {}

  async permits(ctx: RequestContext, reportId: string): Promise<boolean> {
    if (isSystemContext(ctx)) return true;
    if (ctx.kind !== 'institution') return false;

    if (ctx.rawRole === 'THERAPIST') {
      const rows = await this.data.query(
        `SELECT 1
         FROM "reports" report
         INNER JOIN "sessions" session ON session."id" = report."session_id"
         WHERE report."id" = $1
           AND (
             session."therapist_user_id" = $2
             OR session."institution_id" = $3
           )
         LIMIT 1`,
        [reportId, ctx.userId, ctx.institutionId],
      );
      return rows.length > 0;
    }

    if (ctx.rawRole === 'INSTITUTION_ADMIN') {
      const rows = await this.data.query(
        `SELECT 1
         FROM "reports" report
         INNER JOIN "sessions" session ON session."id" = report."session_id"
         WHERE report."id" = $1 AND session."institution_id" = $2
         LIMIT 1`,
        [reportId, ctx.institutionId],
      );
      return rows.length > 0;
    }

    return false;
  }
}
