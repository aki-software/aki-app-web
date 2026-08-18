import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SessionScope } from '../types/session-scope.type.js';
import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { SessionsQueryService } from './sessions-query.service.js';

@Injectable()
export class SessionsOrchestratorService {
  private readonly logger = new Logger(SessionsOrchestratorService.name);

  constructor(
    private readonly sessionsQueryService: SessionsQueryService,
    private readonly reportOrchestratorService: ReportOrchestratorService,
    private readonly sessionOwnerResolverService: SessionOwnerResolverService,
  ) {}

  async sendReport(
    id: string,
    email: string,
    customTitle: string | null,
    scope: SessionScope,
    force?: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedScope = await this.normalizeFirebasePatientScope(scope);
    const session = await this.sessionsQueryService.findOne(
      id,
      normalizedScope,
    );
    const result = await this.reportOrchestratorService.sendReport(
      session.id,
      email,
      customTitle,
      normalizedScope,
    );
    void force;
    return {
      success: result.success,
      message: result.message,
    };
  }

  private async normalizeFirebasePatientScope(
    scope: SessionScope,
  ): Promise<SessionScope> {
    if (scope.role?.toUpperCase() !== 'PATIENT' || !scope.email) {
      return scope;
    }

    const patient = await this.sessionOwnerResolverService.resolveFirebaseUser(
      { uid: scope.patientId, email: scope.email },
      false,
    );

    if (!patient) {
      throw new NotFoundException('Firebase patient identity is not mapped');
    }

    return { ...scope, patientId: patient.id };
  }
}
