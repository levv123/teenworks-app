import { useCallback, useState } from 'react';
import { useAuthContext } from '../store/AuthContext';
import { login, logout, register, RegisterData, LoginData } from '../api/auth';

export function useAuth() {
  const { session, user, loading, refreshUser } = useAuthContext();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = useCallback(async (data: LoginData) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setAuthError(message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (data: RegisterData) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await register(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await logout();
    } catch (err: unknown) {
      console.error('Logout error:', err);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return {
    session,
    user,
    loading: loading || authLoading,
    error: authError,
    isAuthenticated: !!session,
    isClient: user?.profile?.role === 'client',
    isProvider: user?.profile?.role === 'provider',
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  };
}
