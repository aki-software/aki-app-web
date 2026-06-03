import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../../common/jobs/handlers/job-handler.interface.js';
import { JobNames } from '../../common/jobs/job-names.js';
import { CalculateMetricsJobPayload } from '../../common/jobs/calculate-metrics.job.js';
import { SessionMetricsService } from './session-metrics.service.js';

@Injectable()
export class CalculateMetricsHandler implements JobHandler<CalculateMetricsJobPayload> {
  readonly name = JobNames.CalculateMetrics;
  private readonly defaultTimeoutMs = 30_000;
  private readonly logger = new Logger(CalculateMetricsHandler.name);

  constructor(private readonly sessionMetricsService: SessionMetricsService) {}

  getTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  getJobContext(payload: CalculateMetricsJobPayload) {
    return {
      sessionId: payload.sessionId,
    };
  }

  async handle(payload: CalculateMetricsJobPayload): Promise<unknown> {
    const { sessionId } = payload;

    this.logger.log(`job-metrics dispatch sessionId=${sessionId}`);

    return await this.sessionMetricsService.calculateAndSaveMetrics(sessionId);
  }
}
