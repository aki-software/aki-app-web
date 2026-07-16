import { API_URL } from "../../../config/app-config";
import type {
  LoginCredentials,
  AuthLoginResponse as LoginResponse,
  AuthTokenResolutionResponse as ResolveSetupTokenResponse,
  AuthTokenResolutionResponse as ResolveResetTokenResponse,
} from "@akit/contracts";

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
export async function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    let errorMessage = response.status === 401 ? 'UNAUTHORIZED' : `SERVER_ERROR_${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignorar si no se puede parsear JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function logoutRequest(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch(error) {
    console.warn('[Auth API] Fallo al invalidar el token en el servidor:', error);
  }
}

export async function resolveSetupTokenRequest(token: string): Promise<ResolveSetupTokenResponse> {
  const response = await fetch(`${API_URL}/auth/resolve-setup-token`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  return response.json() as Promise<ResolveSetupTokenResponse>;
}

export async function setupPasswordRequest(input: { token: string; password: string; }): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/setup-password`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("SETUP_FAILED");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function requestPasswordResetRequest(email: string): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(`${API_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error("RESET_REQUEST_FAILED");
  }

  return response.json() as Promise<{ ok: boolean; message: string }>;
}

export async function resolveResetTokenRequest(token: string): Promise<ResolveResetTokenResponse> {
  const response = await fetch(`${API_URL}/auth/resolve-reset-token`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  return response.json() as Promise<ResolveResetTokenResponse>;
}

export async function resetPasswordRequest(input: { token: string; password: string; }): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("RESET_FAILED");
  }

  return response.json() as Promise<LoginResponse>;
}
