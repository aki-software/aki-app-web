import { JobNames } from './job-names.js';
import { JobRetryOptions } from './job-base.types.js';

export type GeneratePdfJobPayload = JobRetryOptions & {
  html?: string;
  fileName?: string;
  sessionId?: string;
  userId?: string;
  isB2C?: boolean;
};

export type GeneratePdfJob = {
  name: JobNames.GeneratePdf;
  payload: GeneratePdfJobPayload;
};
