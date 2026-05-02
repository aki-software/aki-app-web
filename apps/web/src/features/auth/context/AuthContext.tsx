import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { loginRequest, logoutRequest, type AuthUser, type LoginCredentials } from '../api/auth';
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '../../../utils/storage';
import { AuthContext } from './auth.context';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return getStoredUser<AuthUser>() || null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() =>{
    try {
      return getStoredToken() || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);


  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user: loggedUser, tokens } = await loginRequest(credentials);
      setStoredToken(tokens.accessToken);
      setStoredUser(loggedUser);
      setUser(loggedUser);
      setAccessToken(tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (accessToken) {
        await logoutRequest(accessToken);
      }
    } catch (error) {
      console.error("Fallo al cerrar sesión en el servidor:", error);
    } finally {
      clearStoredAuth();
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
    }
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }),
    [user, accessToken, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};