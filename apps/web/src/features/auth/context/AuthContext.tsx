import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { loginRequest, logoutRequest,} from '../api/auth';
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  setStoredToken,
  setStoredUser,
} from '../../../utils/storage';
import { AuthContext, AuthContextValue } from './auth.context';
import { AuthUser, LoginCredentials } from '@akit/contracts';

// interface is defined in auth.context.ts
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const storedToken = getStoredToken();
      if (!storedToken || isTokenExpired(storedToken)) {
        clearStoredAuth();
        return null;
      }
      return getStoredUser<AuthUser>() || null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      const storedToken = getStoredToken();
      if (!storedToken || isTokenExpired(storedToken)) {
        return null;
      }
      return storedToken;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('activeInstitutionId') || user?.institutionId || null;
    } catch {
      return null;
    }
  });

  const handleSetActiveInstitutionId = useCallback((id: string | null) => {
    setActiveInstitutionId(id);
    if (id) {
      localStorage.setItem('activeInstitutionId', id);
    } else {
      localStorage.removeItem('activeInstitutionId');
    }
  }, []);
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
      try {
        sessionStorage.setItem('voluntary_logout', 'true');
      } catch (e) {
        console.error("Error setting voluntary_logout", e);
      }
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
      activeInstitutionId,
      setActiveInstitutionId: handleSetActiveInstitutionId,
    }),
    [user, accessToken, isLoading, login, logout, activeInstitutionId, handleSetActiveInstitutionId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};