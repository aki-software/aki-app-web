import { Request } from 'express';
import { UserRole } from '../users/entities/user.entity.js';

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

export type AuthUserSummary = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId: string | null;
  institutionName: string | null;
};

export type AuthLoginResponse = {
  user: AuthUserSummary;
  tokens: {
    accessToken: string;
  };
};

export type AuthTokenResolutionResponse = {
  user: AuthUserSummary;
  expiresAt: Date;
};

export type AuthOkResponse = {
  ok: true;
};

export type AuthInfoResponse = AuthOkResponse & {
  message: string;
};
