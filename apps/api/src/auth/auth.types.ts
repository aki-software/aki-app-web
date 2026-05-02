import { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
    institutionId?: string;
    id?: string;
    email?: string;
  };
};
