import { JobNames } from './job-names';
import { JobRetryOptions } from './job-base.types';

export type SendEmailJobPayload = JobRetryOptions & {
  template: string;
  payload: Record<string, unknown>;
  meta: {
    to: string;
    subject: string;
    attachments?: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[];
  };
};

export type SendEmailJob = {
  name: JobNames.SendEmail;
  payload: SendEmailJobPayload;
};
