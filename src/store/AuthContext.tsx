import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import { getProfile, getProviderProfile } from '../api/auth';
import { AuthUser, Profile, ProviderProfile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  refreshUser: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (s: Session) => {
    try {
      const [profile, providerProfile] = await Promise.all([
        getProfile(s.user.id),
        getProviderProfile(s.user.id),
      ]);
      setUser({
        id: s.user.id,
        email: s.user.email ?? '',
        profile,
        providerProfile,
      });
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session) return;
    await loadUser(session);
  }, [session, loadUser]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadUser(s).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) {
        await loadUser(s);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ session, user, loading, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
