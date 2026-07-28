import { Injectable, Logger } from '@nestjs/common';
import { SessionScope } from '../types/session-scope.type.js';
import { SessionsQueryService } from './sessions-query.service.js';
import { ReportOrchestratorService } from './report-orchestrator.service.js';

@Injectable()
export class SessionsOrchestratorService {
  private readonly logger = new Logger(SessionsOrchestratorService.name);

  constructor(
    private readonly sessionsQueryService: SessionsQueryService,
    private readonly reportOrchestratorService: ReportOrchestratorService,
  ) {}

  async sendReport(
    id: string,
    email: string,
    customTitle: string | null,
    scope: SessionScope,
    force?: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.sessionsQueryService.findOne(id, scope);
    const result = await this.reportOrchestratorService.sendReport(
      session.id,
      email,
      customTitle,
      scope,
      force,
    );
    return {
      success: result.success,
      message: result.message,
    };
  }
}
