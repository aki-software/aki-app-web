import { Request } from 'express';
export * from '@akit/contracts';

export type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    id?: string;
    email?: string;
    role?: string;
    institutionId?: string;
  };
};
