export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface ResolveSetupTokenResponse {
  user: AuthUser & {
    institutionName?: string | null;
  };
  expiresAt: string;
}