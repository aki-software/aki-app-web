const TOKEN_KEY = "akit_access_token";
const USER_KEY = "akit_user";

/**
 * Decodifica la payload de un JWT y verifica si ya expiró.
 * No valida la firma — solo compara el claim `exp` con el tiempo actual.
 * Retorna `true` si el token expiró o no pudo ser parseado.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp !== "number") return true;
    // Comparamos en segundos, con 30s de margen de tolerancia
    return payload.exp < Math.floor(Date.now() / 1000) + 30;
  } catch {
    return true;
  }
}

export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
