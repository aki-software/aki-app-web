import { JobNames } from './job-names';
import { JobRetryOptions } from './job-base.types';

export type SendReportJobPayload = JobRetryOptions & {
  sessionId: string;
  targetEmail: string;
  scope?: {
    role?: string;
    patientId?: string;
    therapistUserId?: string;
    institutionId?: string;
  };
};

export type SendReportJob = {
  name: JobNames.SendReport;
  payload: SendReportJobPayload;
};
