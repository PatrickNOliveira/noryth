import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  credentialsReceived,
  loggedOut,
  userLoaded,
} from '../store/slices/auth.slice';
import { authService } from '../services/auth.service';
import { LoginPayload, RegisterPayload } from '../types/auth';
import { User } from '../types/user';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True while validating a persisted token on startup. */
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Owns authentication for the app. Backed by the persisted Redux `auth` slice,
 * it exposes login/register/logout and revalidates the stored token on boot.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const [initializing, setInitializing] = useState<boolean>(!!token);

  // On mount, if a token was rehydrated, confirm it still identifies a user.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        const me = await authService.me();
        if (!cancelled) dispatch(userLoaded(me));
      } catch {
        if (!cancelled) dispatch(loggedOut());
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await authService.login(payload);
      dispatch(credentialsReceived(response));
    },
    [dispatch],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await authService.register(payload);
      dispatch(credentialsReceived(response));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(loggedOut());
  }, [dispatch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      initializing,
      login,
      register,
      logout,
    }),
    [user, token, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
