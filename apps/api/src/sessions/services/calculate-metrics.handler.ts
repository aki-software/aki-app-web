import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobNames } from '../../common/jobs/job-names.js';
import { CalculateMetricsJobPayload } from '../../common/jobs/calculate-metrics.job.js';
import { SessionMetricsService } from './session-metrics.service.js';
import { LocalMetricsService } from '../../common/metrics/local-metrics.service.js';

@Processor('metrics')
@Injectable()
export class CalculateMetricsHandler extends WorkerHost {
  readonly name = JobNames.CalculateMetrics;
  private readonly logger = new Logger(CalculateMetricsHandler.name);

  constructor(
    private readonly sessionMetricsService: SessionMetricsService,
    @Optional() private readonly localMetrics?: LocalMetricsService,
  ) {
    super();
  }

  async process(job: Job<CalculateMetricsJobPayload>): Promise<unknown> {
    const { sessionId } = job.data;
    this.logger.log(`job-metrics dispatch sessionId=${sessionId}`);
    try {
      const result =
        await this.sessionMetricsService.calculateAndSaveMetrics(sessionId);
      this.localMetrics?.recordDomainAttempt(
        'evaluation_calculation',
        'success',
      );
      return result;
    } catch (error) {
      this.localMetrics?.recordDomainAttempt(
        'evaluation_calculation',
        'failure',
      );
      throw error;
    }
  }
}
