import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JobHandler } from './job-handler.interface.js';
import { JobNames } from '../job-names.js';
import { SendReportJobPayload } from '../send-report.job.js';
import { ReportOrchestratorService } from '../../../sessions/services/report-orchestrator.service.js';

@Injectable()
export class SendReportHandler implements JobHandler<SendReportJobPayload> {
  readonly name = JobNames.SendReport;
  private readonly logger = new Logger(SendReportHandler.name);
  private readonly defaultTimeoutMs = 90_000;

  constructor(private readonly moduleRef: ModuleRef) {}

  private getReportOrchestratorService(): ReportOrchestratorService {
    return this.moduleRef.get(ReportOrchestratorService, { strict: false });
  }

  getTimeoutMs(payload: SendReportJobPayload): number {
    return payload.timeoutMs ?? this.defaultTimeoutMs;
  }

  getJobContext(payload: SendReportJobPayload) {
    return {
      jobId: payload.jobId,
      sessionId: payload.sessionId,
      voucherId: payload.voucherId,
    };
  }

  async handle(payload: SendReportJobPayload): Promise<unknown> {
    const { sessionId, targetEmail, scope, voucherId } = payload;

    this.logger.log(
      `job-report dispatch jobId=${payload.jobId ?? 'none'} sessionId=${sessionId} voucherId=${voucherId ?? 'none'} targetEmail=${targetEmail}`,
    );

    return await this.getReportOrchestratorService().sendReport(
      sessionId,
      targetEmail,
      voucherId,
      scope,
      // Pass signal here if the service ever starts supporting it
      // signal,
    );
  }
}
