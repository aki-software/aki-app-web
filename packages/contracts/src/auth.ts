export enum UserRole {
  ADMIN = 'ADMIN',
  THERAPIST = 'THERAPIST',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
  PATIENT = 'PATIENT',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  institutionId?: string | null;
  institutionName?: string | null;
}

export interface AuthUserSummary extends AuthUser {}

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  institutionId?: string | null;
  iss?: string;
  aud?: string;
}

export interface FirebaseJwtPayload extends JwtPayload {
  user_id?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthLoginResponse {
  user: AuthUserSummary;
  tokens: AuthTokens;
}

export interface AuthTokenResolutionResponse {
  user: AuthUserSummary;
  expiresAt: string | Date;
}

export interface AuthOkResponse {
  ok: boolean;
}

export interface AuthInfoResponse extends AuthOkResponse {
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Aliases for compatibility during migration
export type LoginResponse = AuthLoginResponse;
export type AuthUserPayload = {
  userId: string;
  email?: string;
  role: string;
  institutionId: string | null;
};
