import { JobNames } from './job-names.js';
import { JobRetryOptions } from './job-base.types.js';

export type SendEmailJobMeta = {
  to: string;
  subject: string;
  sessionId?: string;
  voucherId?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
};

export type SendEmailJobPayload = JobRetryOptions & {
  template: string;
  payload: Record<string, unknown>;
  meta: SendEmailJobMeta;
};

export type SendEmailJob = {
  name: JobNames.SendEmail;
  payload: SendEmailJobPayload;
};
