import { JobNames } from './job-names.js';
import { JobRetryOptions } from './job-base.types.js';

export type SendReportJobPayload = JobRetryOptions & {
  sessionId: string;
  targetEmail: string;
  voucherId?: string | null;
  scope?: {
    role?: string;
    email?: string;
    patientId?: string;
    therapistUserId?: string;
    institutionId?: string;
  };
};

export type SendReportJob = {
  name: JobNames.SendReport;
  payload: SendReportJobPayload;
};
