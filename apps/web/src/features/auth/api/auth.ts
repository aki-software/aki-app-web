import { apiClient } from "../../../api/client";
import type {
  LoginCredentials,
  AuthLoginResponse as LoginResponse,
  AuthTokenResolutionResponse as ResolveSetupTokenResponse,
  AuthTokenResolutionResponse as ResolveResetTokenResponse,
} from "@akit/contracts";

export async function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', credentials, { skipAuthRedirect: true });
}

export async function logoutRequest(accessToken: string): Promise<void> {
  try {
    await apiClient.post<{ ok: boolean }>('/auth/logout', undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    console.warn('[Auth API] Fallo al invalidar el token en el servidor:', error);
  }
}

export async function resolveSetupTokenRequest(token: string): Promise<ResolveSetupTokenResponse> {
  return apiClient.post<ResolveSetupTokenResponse>('/auth/resolve-setup-token', { token });
}

export async function setupPasswordRequest(input: { token: string; password: string; }): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/setup-password', input);
}

export async function requestPasswordResetRequest(email: string): Promise<{ ok: boolean; message: string }> {
  return apiClient.post<{ ok: boolean; message: string }>('/auth/request-password-reset', { email });
}

export async function resolveResetTokenRequest(token: string): Promise<ResolveResetTokenResponse> {
  return apiClient.post<ResolveResetTokenResponse>('/auth/resolve-reset-token', { token });
}

export async function resetPasswordRequest(input: { token: string; password: string; }): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/reset-password', input);
}
