import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ConsentPolicyPort,
  ReportAccessScope,
} from './report-access.service.js';

@Injectable()
export class ReportConsentPolicyService implements ConsentPolicyPort {
  constructor(private readonly data: DataSource) {}

  async permits(scope: ReportAccessScope, reportId: string): Promise<boolean> {
    if (scope.role === 'THERAPIST') {
      if (!scope.userId && !scope.institutionId) return false;
      const rows = await this.data.query(
        `SELECT 1
         FROM "reports" report
         INNER JOIN "sessions" session ON session."id" = report."session_id"
         WHERE report."id" = $1
           AND (
             session."therapist_user_id" = $2
             OR ($3::uuid IS NOT NULL AND session."institution_id" = $3)
           )
         LIMIT 1`,
        [reportId, scope.userId ?? null, scope.institutionId ?? null],
      );
      return rows.length > 0;
    }

    if (scope.role !== 'INSTITUTION_ADMIN' || !scope.institutionId) return false;
    const rows = await this.data.query(
      `SELECT 1
       FROM "reports" report
       INNER JOIN "sessions" session ON session."id" = report."session_id"
       WHERE report."id" = $1 AND session."institution_id" = $2
       LIMIT 1`,
      [reportId, scope.institutionId],
    );
    return rows.length > 0;
  }
}
