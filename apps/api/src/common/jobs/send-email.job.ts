import { JobNames } from './job-names';
import { JobRetryOptions } from './job-base.types';

export type EmailTemplateName =
  | 'voucher-code'
  | 'account-activation'
  | 'password-reset';

export type SendEmailJobPayload = JobRetryOptions & {
  template: EmailTemplateName;
  payload: Record<string, unknown>;
  meta: {
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
};

export type SendEmailJob = {
  name: JobNames.SendEmail;
  payload: SendEmailJobPayload;
};
