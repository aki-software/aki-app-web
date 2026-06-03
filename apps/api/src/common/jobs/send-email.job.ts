import { JobNames } from './job-names.js';
import { JobRetryOptions } from './job-base.types.js';

export type EmailTemplateName =
  | 'voucher-code'
  | 'account-activation'
  | 'password-reset';

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

export type VoucherCodeEmailPayload = JobRetryOptions & {
  template: 'voucher-code';
  payload: { voucherCode: string; patientName?: string };
  meta: SendEmailJobMeta;
};

export type AccountActivationEmailPayload = JobRetryOptions & {
  template: 'account-activation';
  payload: {
    name: string;
    activationLink: string;
    institutionName?: string | null;
  };
  meta: SendEmailJobMeta;
};

export type PasswordResetEmailPayload = JobRetryOptions & {
  template: 'password-reset';
  payload: { name: string; resetLink: string };
  meta: SendEmailJobMeta;
};

export type SendEmailJobPayload =
  | VoucherCodeEmailPayload
  | AccountActivationEmailPayload
  | PasswordResetEmailPayload;

export type SendEmailJob = {
  name: JobNames.SendEmail;
  payload: SendEmailJobPayload;
};
