import { QueueJobOptions } from './queue.adapter.js';
import { JobNames } from '../jobs/job-names.js';

export function applyQueueDefaults(
  jobName: string,
  options?: QueueJobOptions,
): QueueJobOptions | undefined {
  const defaultJobs = new Set<string>([
    JobNames.SendEmail,
    JobNames.SendReport,
    JobNames.GeneratePdf,
  ]);

  if (!defaultJobs.has(jobName)) {
    return options;
  }

  return {
    ...options,
    attempts: options?.attempts ?? 3,
    backoffMs: options?.backoffMs ?? 60_000,
    backoffType: options?.backoffType ?? 'exponential',
  };
}
