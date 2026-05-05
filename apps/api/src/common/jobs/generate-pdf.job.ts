import { JobNames } from './job-names';
import { JobRetryOptions } from './job-base.types';

export type GeneratePdfJobPayload = JobRetryOptions & {
  html: string;
  fileName?: string;
};

export type GeneratePdfJob = {
  name: JobNames.GeneratePdf;
  payload: GeneratePdfJobPayload;
};
