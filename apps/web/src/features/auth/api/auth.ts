const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export async function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Credenciales incorrectas. Verificá tu email y contraseña.');
    }
    throw new Error(`Error del servidor (${response.status}). Intentá de nuevo más tarde.`);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function logoutRequest(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Si falla el logout remoto, continuamos igual (limpiamos local storage)
  }
}

export async function resolveSetupTokenRequest(
  token: string
): Promise<ResolveSetupTokenResponse> {
  const response = await fetch(`${API_URL}/auth/resolve-setup-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("El enlace de activación no es válido o ya expiró.");
  }

  return response.json() as Promise<ResolveSetupTokenResponse>;
}

export async function setupPasswordRequest(input: {
  token: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/setup-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("No se pudo activar la cuenta.");
  }

  return response.json() as Promise<LoginResponse>;
}
