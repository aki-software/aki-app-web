import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../../common/jobs/handlers/job-handler.interface.js';
import { JobNames } from '../../common/jobs/job-names.js';
import { ReportOrchestratorService } from '../services/report-orchestrator.service.js';
import { GeneratePdfJobPayload } from '../../common/jobs/generate-pdf.job.js';

@Injectable()
export class PdfProcessor implements JobHandler<GeneratePdfJobPayload> {
  readonly name = JobNames.GeneratePdf;
  private readonly logger = new Logger(PdfProcessor.name);
  private readonly defaultTimeoutMs = 120_000;

  constructor(
    private readonly reportOrchestratorService: ReportOrchestratorService,
  ) {}

  getTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  getJobContext(payload: GeneratePdfJobPayload) {
    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
    };
  }

  async handle(payload: GeneratePdfJobPayload): Promise<void> {
    if (!payload.sessionId) {
      this.logger.warn('Skipping async PDF generation: No sessionId provided');
      return;
    }

    this.logger.log(
      `Preloading PDF for session ${payload.sessionId} (B2C: ${payload.isB2C})`,
    );

    // We can call a preloadReport method on the orchestrator to populate the cache
    await this.reportOrchestratorService.preloadReport(payload.sessionId);
  }
}
