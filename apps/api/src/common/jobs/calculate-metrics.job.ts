import { JobNames } from './job-names.js';

export type CalculateMetricsJobPayload = {
  sessionId: string;
};

export type CalculateMetricsJob = {
  name: JobNames.CalculateMetrics;
  payload: CalculateMetricsJobPayload;
};
