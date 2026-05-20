import { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    id?: string;
    email?: string;
    role?: string;
    institutionId?: string;
  };
};
