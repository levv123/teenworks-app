/**
 * The Supabase sign-in session, for the whole app.
 *
 * Signing in is optional: signed out, the app runs on the local store exactly
 * as before, and the flows that need an account (Apply, saving a service to
 * Supabase) read the session when they run. This context is what the sign-in
 * screen and Profile use to show, start and end that session.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../api/supabase';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

/** How a sign-up ended when it didn't fail. */
export type SignUpResult = 'signed-in' | 'confirm-email';

export interface SessionValue {
  status: SessionStatus;
  /** False when the build has no Supabase URL and key, so nobody can sign in. */
  configured: boolean;
  userId: string | null;
  email: string | null;
  /** Rejects with a message fit to show under the form. */
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export const NOT_CONFIGURED =
  "Sign-in isn't set up for this version of TeenWorks yet. You can keep using the app without an account.";

const SessionContext = createContext<SessionValue | null>(null);

/** Supabase's own messages are written for developers; these are for people. */
function friendlyError(err: unknown, fallback: string): Error {
  const raw = err instanceof Error ? err.message : '';
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return new Error("That email and password don't match an account.");
  }
  if (lower.includes('email not confirmed')) {
    return new Error('Confirm your email first. The link is in the message we sent you.');
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return new Error('An account with this email already exists. Sign in instead.');
  }
  if (lower.includes('password')) return new Error(raw);
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return new Error('Too many tries. Wait a minute, then try again.');
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return new Error("Couldn't reach TeenWorks. Check your connection and try again.");
  }
  return new Error(fallback);
}

/**
 * Posting a service needs a provider_profiles row (provider_services has a
 * foreign key to it), and the signup trigger only creates profiles. Inserting
 * with ON CONFLICT DO NOTHING keeps an existing row untouched.
 */
async function ensureProviderProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('provider_profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) console.warn('[TeenWorks] Could not create provider profile:', error.message);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>(
    supabaseConfigured ? 'loading' : 'signed-out',
  );

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let active = true;

    const apply = (next: Session | null) => {
      if (!active) return;
      setSession(next);
      setStatus(next ? 'signed-in' : 'signed-out');
    };

    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch((err) => {
        // An unreachable project reads as signed out rather than hanging.
        console.warn('[TeenWorks] getSession failed:', err?.message ?? err);
        apply(null);
      });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      apply(next);
      if (event === 'SIGNED_IN' && next) {
        // Deferred: supabase-js deadlocks if this callback awaits its own calls.
        setTimeout(() => void ensureProviderProfile(next.user.id), 0);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) throw new Error(NOT_CONFIGURED);
    let result;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch (err) {
      throw friendlyError(err, "Couldn't sign you in. Try again.");
    }
    if (result.error) throw friendlyError(result.error, "Couldn't sign you in. Try again.");
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<SignUpResult> => {
      if (!supabaseConfigured) throw new Error(NOT_CONFIGURED);
      let result;
      try {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            // The signup trigger copies full_name into public.profiles.
            data: { full_name: name },
            emailRedirectTo:
              Platform.OS === 'web' && typeof window !== 'undefined'
                ? window.location.origin
                : undefined,
          },
        });
      } catch (err) {
        throw friendlyError(err, "Couldn't create your account. Try again.");
      }
      if (result.error) {
        throw friendlyError(result.error, "Couldn't create your account. Try again.");
      }
      // With email confirmation on, Supabase returns no session until the link is opened.
      return result.data.session ? 'signed-in' : 'confirm-email';
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Still sign out on this device when the server can't be reached.
      console.warn('[TeenWorks] signOut failed:', error.message);
      await supabase.auth.signOut({ scope: 'local' });
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      configured: supabaseConfigured,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [status, session, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
