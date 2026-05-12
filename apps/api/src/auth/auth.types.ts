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

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  institutionId?: string | null;
  iss?: string;
  aud?: string;
};

export type FirebaseJwtPayload = JwtPayload & {
  user_id?: string;
  iss: string;
  aud: string;
};

export type AuthUserPayload = {
  userId: string;
  email?: string;
  role: string;
  institutionId: string | null;
};
