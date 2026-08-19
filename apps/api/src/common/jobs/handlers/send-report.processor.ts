import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import { SendReportJobPayload } from '../send-report.job.js';
import { ReportOrchestratorService } from '../../../sessions/services/report-orchestrator.service.js';

@Processor('send-report')
export class SendReportProcessor extends WorkerHost {
  private readonly logger = new Logger(SendReportProcessor.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  private getReportOrchestratorService(): ReportOrchestratorService {
    return this.moduleRef.get(ReportOrchestratorService, { strict: false });
  }

  async process(job: Job<SendReportJobPayload, any, string>): Promise<unknown> {
    const payload = job.data;
    const { sessionId, targetEmail, scope, voucherId } = payload;

    this.logger.log(
      `job-report dispatch jobId=${payload.jobId ?? 'none'} sessionId=${sessionId} voucherId=${voucherId ?? 'none'} targetEmail=${targetEmail}`,
    );

    return await this.getReportOrchestratorService().sendReport(
      sessionId,
      targetEmail,
      voucherId,
      scope,
    );
  }
}
