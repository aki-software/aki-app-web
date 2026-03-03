import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loginRequest, logoutRequest, type AuthUser, type LoginCredentials } from '../api/auth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Constantes de localStorage ───────────────────────────────────────────────

const TOKEN_KEY = 'akit_access_token';
const USER_KEY = 'akit_user';

// ─── Contexto ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true al inicio para rehidratar sesión

  // Rehidratar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
    } catch {
      // Datos corruptos: limpiamos
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: loggedUser, tokens } = await loginRequest(credentials);

    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));

    setUser(loggedUser);
    setAccessToken(tokens.accessToken);
  }, []);

  const logout = useCallback(async () => {
    if (accessToken) {
      await logoutRequest(accessToken);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setAccessToken(null);
  }, [accessToken]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
