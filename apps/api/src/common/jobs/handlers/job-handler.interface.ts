import { JobNames } from '../job-names.js';

export interface JobHandler<T = any> {
  readonly name: JobNames;
  handle(payload: T): Promise<unknown>;
  getTimeoutMs(payload: T): number;
  getJobContext(payload: T): {
    jobId?: string;
    sessionId?: string;
    voucherId?: string | null;
  };
}
