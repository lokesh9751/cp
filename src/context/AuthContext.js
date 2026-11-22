'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  signup as apiSignup,
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  getCurrentUser,
} from '@/lib/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInProgress = useRef(false);

  const storeAuthState = useCallback((userData, token) => {
    try {
      localStorage.setItem(
        'competitive-pirates-auth',
        JSON.stringify({ user: userData, accessToken: token })
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearAuthState = useCallback(() => {
    try {
      localStorage.removeItem('competitive-pirates-auth');
    } catch {
      // ignore
    }
  }, []);

  // Restore session on mount (always resolves so Header never gets stuck)
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem('competitive-pirates-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.accessToken) {
            try {
              const { user: restoredUser } = await getCurrentUser(parsed.accessToken);
              if (active && restoredUser) {
                setUser(restoredUser);
                setAccessToken(parsed.accessToken);
                storeAuthState(restoredUser, parsed.accessToken);
                return;
              }
            } catch {
              clearAuthState();
            }
          }
        }

        // Try cookie-based refresh silently
        try {
          const data = await refreshAccessToken();
          if (active && data?.authenticated && data?.user && data?.accessToken) {
            setUser(data.user);
            setAccessToken(data.accessToken);
            storeAuthState(data.user, data.accessToken);
            return;
          }
        } catch {
          // Guest user or backend unreachable
        }

        if (active) {
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        clearAuthState();
        if (active) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, [clearAuthState, storeAuthState]);

  const login = useCallback(
    async ({ identifier, password }) => {
      const { user: loggedInUser, accessToken: newToken } = await apiLogin({
        identifier,
        password,
      });
      setUser(loggedInUser);
      setAccessToken(newToken);
      storeAuthState(loggedInUser, newToken);
      return { user: loggedInUser, accessToken: newToken };
    },
    [storeAuthState]
  );

  const signup = useCallback(
    async ({ username, email, password }) => {
      const { user: newUser, accessToken: newToken } = await apiSignup({
        username,
        email,
        password,
      });
      setUser(newUser);
      setAccessToken(newToken);
      storeAuthState(newUser, newToken);
      return { user: newUser, accessToken: newToken };
    },
    [storeAuthState]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Clear local session even if backend call fails
    }
    setUser(null);
    setAccessToken(null);
    clearAuthState();
  }, [clearAuthState]);

  const refresh = useCallback(async () => {
    if (refreshInProgress.current) return null;
    refreshInProgress.current = true;

    try {
      const { accessToken: newToken, authenticated, user: refreshedUser } =
        await refreshAccessToken();

      if (!authenticated || !newToken) {
        setUser(null);
        setAccessToken(null);
        clearAuthState();
        return null;
      }

      setAccessToken(newToken);
      const finalUser = refreshedUser || user;
      if (finalUser) {
        setUser(finalUser);
        storeAuthState(finalUser, newToken);
      }
      return newToken;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setAccessToken(null);
        clearAuthState();
      }
      throw error;
    } finally {
      refreshInProgress.current = false;
    }
  }, [user, storeAuthState, clearAuthState]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        signup,
        logout,
        refresh,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}